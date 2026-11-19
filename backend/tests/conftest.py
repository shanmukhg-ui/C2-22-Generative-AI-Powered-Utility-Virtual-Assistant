import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

# Ensure test environment variables
os.environ["USE_MOCK_MONGO"] = "true"
os.environ["DEMO_MODE"] = "true"
os.environ["FIREBASE_PROJECT_ID"] = "c2-22-utility-assistant"

from app.main import app
from app.database.mongo import DatabaseManager

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    db_mgr = DatabaseManager()
    db_mgr.seed_data()
    return db_mgr

@pytest.fixture
def client():
    return TestClient(app)
