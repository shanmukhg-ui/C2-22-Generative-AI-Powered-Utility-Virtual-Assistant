import csv
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment
base_dir = Path(__file__).resolve().parent.parent
load_dotenv(base_dir / ".env")
load_dotenv(base_dir / "backend" / ".env")

import pymongo

mongo_uri = os.getenv("MONGODB_URI", "")
db_name = os.getenv("MONGODB_DATABASE", "utility_virtual_assistant")
datasets_dir = base_dir / "datasets"

print("=" * 60)
print(f"Connecting to MongoDB Atlas at: {mongo_uri[:30]}...")

if not mongo_uri or "localhost" in mongo_uri and os.getenv("USE_MOCK_MONGO", "true").lower() == "true":
    print("ERROR: MONGODB_URI is not set to a live MongoDB Atlas connection string.")
    print("Please set MONGODB_URI in .env first.")
    sys.exit(1)

try:
    client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=8000)
    # Ping
    client.admin.command('ping')
    print("Successfully connected to MongoDB Atlas!")
except Exception as e:
    print(f"Failed to connect to MongoDB Atlas: {e}")
    sys.exit(1)

db = client[db_name]

# Helper to seed CSV
def seed_collection_from_csv(collection_name: str, csv_path: Path):
    if not csv_path.exists():
        print(f"Warning: {csv_path} not found.")
        return
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        records = list(reader)
        if records:
            # Clean collection first to prevent duplicate keys on re-seed
            db[collection_name].delete_many({})
            db[collection_name].insert_many(records)
            print(f"✓ Seeded {len(records)} records into '{collection_name}' collection.")
        else:
            print(f"No records in {csv_path.name}")

print("\n--- Seeding Collections into MongoDB Atlas ---")
seed_collection_from_csv("users", datasets_dir / "users.csv")
seed_collection_from_csv("service_requests", datasets_dir / "service_requests.csv")
seed_collection_from_csv("complaints", datasets_dir / "complaints.csv")
seed_collection_from_csv("operational_logs", datasets_dir / "operational_logs.csv")

# Seed initial baseline audit logs
from datetime import datetime
initial_logs = [
    {
        "audit_id": f"AUD_INIT_{100+i}",
        "user_id": uid,
        "role": r,
        "action": "SYSTEM_BOOTSTRAP",
        "timestamp": datetime.now().isoformat(),
        "resource": "database",
        "details": "MongoDB Atlas Collections provisioned & indexed",
        "status": "SUCCESS"
    }
    for i, (uid, r) in enumerate([("ADM0001", "Administrator"), ("EMP0001", "Employee"), ("CUST0001", "Customer")])
]
db.audit_logs.delete_many({"action": "SYSTEM_BOOTSTRAP"})
db.audit_logs.insert_many(initial_logs)
print(f"✓ Seeded {len(initial_logs)} baseline records into 'audit_logs' collection.")

# Verify final counts
print("\n--- MongoDB Atlas Database Overview ---")
for coll_name in db.list_collection_names():
    count = db[coll_name].count_documents({})
    print(f"  • Collection [{coll_name}]: {count} documents")

print("\nAll data successfully loaded into MongoDB Atlas!")
print("=" * 60)
