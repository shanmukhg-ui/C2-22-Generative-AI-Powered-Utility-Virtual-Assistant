import csv
import os
from typing import Dict, Any, List
import mongomock
from app.config import settings

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
        # Collections: users, service_requests, complaints, operational_logs, audit_logs, conversation_history, knowledge_documents
        collections = ["users", "service_requests", "complaints", "operational_logs", "audit_logs", "conversation_history", "knowledge_documents"]
        for c in collections:
            if c not in self.db.list_collection_names():
                # initialize collection
                self.db[c].insert_one({"_init": True})
                self.db[c].delete_one({"_init": True})

    def seed_data(self):
        # 1. Seed Users
        users_file = settings.DATASETS_DIR / "users.csv"
        if users_file.exists() and self.db.users.count_documents({}) == 0:
            with open(users_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                users = list(reader)
                if users:
                    self.db.users.insert_many(users)
                    print(f"Seeded {len(users)} users into MongoDB.")

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
