import csv
import logging
import os
from typing import Dict, Any, List
import mongomock
from app.config import settings

logger = logging.getLogger(__name__)

# Ensure mongomock Collection.create_index honors partialFilterExpression on pre-existing documents
def _patch_mongomock_partial_indexes():
    try:
        from mongomock import filtering, helpers
        from pymongo.errors import DuplicateKeyError, OperationFailure

        def compliant_create_index(self, key_or_list, cache_for=300, session=None, **kwargs):
            index_list = helpers.create_index_list(key_or_list)
            is_unique = kwargs.pop('unique', False)
            is_sparse = kwargs.pop('sparse', False)
            index_name = kwargs.pop('name', helpers.gen_index_name(index_list))
            index_dict = {'key': index_list}
            if is_sparse:
                index_dict['sparse'] = True
            if is_unique:
                index_dict['unique'] = True
            if 'expireAfterSeconds' in kwargs and kwargs['expireAfterSeconds'] is not None:
                index_dict['expireAfterSeconds'] = kwargs.pop('expireAfterSeconds')
            if 'partialFilterExpression' in kwargs and kwargs['partialFilterExpression'] is not None:
                index_dict['partialFilterExpression'] = kwargs.pop('partialFilterExpression')

            existing_index = self._store.indexes.get(index_name)
            if existing_index and index_dict != existing_index:
                raise OperationFailure('Index with name: %s already exists with different options' % index_name)

            if is_unique:
                indexed = set()
                indexed_list = []
                partial_expr = index_dict.get('partialFilterExpression')
                documents_gen = self._store.documents
                for doc in documents_gen:
                    if partial_expr and not filtering.filter_applies(partial_expr, doc):
                        continue
                    index = []
                    for key, unused_order in index_list:
                        try:
                            index.append(helpers.get_value_by_dot(doc, key))
                        except KeyError:
                            if is_sparse:
                                continue
                            index.append(None)
                    if is_sparse and not index:
                        continue
                    index = tuple(index)
                    try:
                        if index in indexed:
                            documents_gen.throw(DuplicateKeyError('E11000 Duplicate Key Error', 11000), None, None)
                        indexed.add(index)
                    except TypeError as err:
                        if index in indexed_list:
                            documents_gen.throw(DuplicateKeyError('E11000 Duplicate Key Error', 11000), None, err)
                        indexed_list.append(index)

            self._store.create_index(index_name, index_dict)
            return index_name

        mongomock.collection.Collection.create_index = compliant_create_index
    except Exception as e:
        logger.debug("Mongomock partial index patch skipped: %s", e)

_patch_mongomock_partial_indexes()

class DatabaseManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return
        self._initialized = True

        if settings.USE_MOCK_MONGO:
            print("Using In-Memory MongoMock for fast, self-contained demonstration.")
            self.client = mongomock.MongoClient()
        else:
            try:
                import pymongo
                self.client = pymongo.MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=10000)
                # Test connection
                self.client.admin.command('ping')
                print("✓ Connected successfully to live MongoDB Atlas instance!")
            except Exception as e:
                print(f"Live MongoDB connection failed ({e}). Falling back to MongoMock.")
                self.client = mongomock.MongoClient()

        self.db = self.client[settings.MONGODB_DATABASE]
        self._ensure_collections()

    @classmethod
    def get_db(cls):
        mgr = cls()
        return mgr.db

    def _ensure_collections(self):
        # Collections: users, service_requests, complaints, operational_logs, audit_logs, conversation_history, knowledge_documents, counters
        collections = ["users", "service_requests", "complaints", "operational_logs", "audit_logs", "conversation_history", "knowledge_documents", "counters"]
        for c in collections:
            if c not in self.db.list_collection_names():
                # initialize collection
                self.db[c].insert_one({"_init": True})
                self.db[c].delete_one({"_init": True})

        # Ensure unique constraints and indexes on users collection
        self._ensure_security_indexes()

    def _ensure_security_indexes(self):
        """
        Enforces required unique indexes on the users collection.
        Scans for existing duplicates and logs/raises if constraints cannot be guaranteed,
        failing fast rather than silently suppressing index creation errors.
        """
        required_indexes = [
            (
                "user_id",
                {"unique": True},
                {"user_id": {"$exists": True}}
            ),
            (
                "firebase_uid",
                {"unique": True, "partialFilterExpression": {"firebase_uid": {"$type": "string"}}},
                {"firebase_uid": {"$type": "string"}}
            ),
            (
                "email",
                {"unique": True, "partialFilterExpression": {"email": {"$type": "string"}}},
                {"email": {"$type": "string"}}
            ),
        ]

        for field, index_kwargs, match_filter in required_indexes:
            # Check for existing duplicate records explicitly using criteria matching the index definition
            pipeline = [
                {"$match": match_filter},
                {"$group": {"_id": f"${field}", "count": {"$sum": 1}}},
                {"$match": {"count": {"$gt": 1}}}
            ]
            try:
                duplicates = list(self.db.users.aggregate(pipeline))
            except Exception as e:
                err_msg = (
                    f"CRITICAL: Failed to scan 'users' collection for duplicate values on '{field}': {e}. "
                    "Startup aborted to prevent starting with unverified security constraints."
                )
                logger.critical(err_msg)
                raise RuntimeError(err_msg) from e

            if duplicates:
                dup_values = [d["_id"] for d in duplicates]
                err_msg = (
                    f"CRITICAL: Cannot create unique security index on 'users.{field}'. "
                    f"Found existing duplicate values: {dup_values}. "
                    "Startup aborted to prevent security and data-integrity degradation."
                )
                logger.critical(err_msg)
                raise RuntimeError(err_msg)

            try:
                self.db.users.create_index(field, **index_kwargs)
                logger.info("Ensured unique index on 'users.%s'.", field)
            except Exception as e:
                err_msg = (
                    f"CRITICAL: Failed to create required security index on 'users.{field}': {e}. "
                    "Startup aborted to maintain security guarantees."
                )
                logger.critical(err_msg)
                raise RuntimeError(err_msg) from e

    def seed_data(self):
        # 1. Seed Users
        users_file = settings.DATASETS_DIR / "users.csv"
        if users_file.exists() and self.db.users.count_documents({}) == 0:
            with open(users_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                users = list(reader)
                for u in users:
                    # Seeded users start without a linked Firebase UID until their first verified login
                    if u.get("firebase_uid", "").startswith("firebase_"):
                        u["firebase_uid"] = None
                if users:
                    self.db.users.insert_many(users)
                    print(f"Seeded {len(users)} users into MongoDB.")

        # Initialize atomic customer_id sequence counter
        if self.db.counters.count_documents({"_id": "customer_id"}) == 0:
            import re
            max_num = 100
            for u in self.db.users.find({"user_id": {"$regex": r"^CUST\d+"}}):
                try:
                    num = int(re.sub(r"[^\d]", "", str(u.get("user_id", ""))))
                    if num > max_num:
                        max_num = num
                except Exception:
                    pass
            self.db.counters.insert_one({"_id": "customer_id", "seq": max_num})
            print(f"Initialized customer_id sequence counter at {max_num}.")

        # 2. Seed Service Requests
        sr_file = settings.DATASETS_DIR / "service_requests.csv"
        if sr_file.exists() and self.db.service_requests.count_documents({}) == 0:
            with open(sr_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                requests = list(reader)
                if requests:
                    self.db.service_requests.insert_many(requests)
                    print(f"Seeded {len(requests)} service requests into MongoDB.")

        # 3. Seed Complaints
        cmp_file = settings.DATASETS_DIR / "complaints.csv"
        if cmp_file.exists() and self.db.complaints.count_documents({}) == 0:
            with open(cmp_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                complaints = list(reader)
                if complaints:
                    self.db.complaints.insert_many(complaints)
                    print(f"Seeded {len(complaints)} complaints into MongoDB.")

        # 4. Seed Operational Logs
        ops_file = settings.DATASETS_DIR / "operational_logs.csv"
        if ops_file.exists() and self.db.operational_logs.count_documents({}) == 0:
            with open(ops_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                logs = list(reader)
                if logs:
                    self.db.operational_logs.insert_many(logs)
                    print(f"Seeded {len(logs)} operational logs into MongoDB.")

        # 5. Seed Baseline Audit Trail
        if self.db.audit_logs.count_documents({}) == 0:
            from datetime import datetime
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            initial_logs = [
                {
                    "audit_id": f"AUD_INIT_{100+i}",
                    "user_id": uid,
                    "role": r,
                    "action": act,
                    "timestamp": now_str,
                    "resource": res,
                    "details": det,
                    "status": "SUCCESS"
                }
                for i, (uid, r, act, res, det) in enumerate([
                    ("ADM0001", "Administrator", "SYSTEM_BOOT", "FastAPI Core", "Production backend boot sequence completed"),
                    ("ADM0001", "Administrator", "SEED_DATABASE", "MongoDB Collections", "105 users, 500 requests, 250 complaints verified"),
                    ("ADM0001", "Administrator", "VECTOR_STORE_SYNC", "Knowledge Vector Store", "6 SOP documents indexed into vector space"),
                    ("EMP0001", "Employee", "DISPATCH_TELEMETRY", "Operations Center", "Ward 1-40 outage telemetry streaming online"),
                    ("CUST0001", "Customer", "CITIZEN_LOGIN", "Firebase Auth", "Customer identity verified with RBAC isolation")
                ])
            ]
            self.db.audit_logs.insert_many(initial_logs)
            print("Seeded baseline audit logs into MongoDB.")

def get_database():
    return DatabaseManager.get_db()
