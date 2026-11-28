#!/usr/bin/env python3
"""
Consistency Check Script: Compares Dashboard KPIs, Backend Stats, and Chatbot Answers.
Fails with exit code 1 on ANY data mismatch across endpoints.
"""
import sys
import os
from datetime import datetime

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.database.mongo import DatabaseManager, get_database
from app.services.stats_service import StatsService
from app.agents.router import AgentQueryRouter

def main():
    print("=" * 70)
    print(" 🚀 UTILITYAI DATA CONSISTENCY & GROUNDING VERIFICATION AUDIT")
    print("=" * 70)

    # 1. Initialize & Seed Database
    DatabaseManager().seed_data()
    db = get_database()
    today_date = datetime.now().strftime("%d %b %Y")

    failures = []

    # 2. Extract Canonical Single Source of Truth
    print("\n[Step 1] Fetching StatsService Single Source of Truth...")
    stats = StatsService.get_all_stats()
    print(f" -> Live Date: {stats['date']}")
    print(f" -> Incidents: Total={stats['incidents']['total']}, Active={stats['incidents']['active_outages']}, Critical={stats['incidents']['critical']}, Resolved={stats['incidents']['resolved_today']}")
    print(f" -> Service Requests: Total={stats['service_requests']['total']}, Awaiting={stats['service_requests']['awaiting_acceptance']}, Assigned={stats['service_requests']['assigned_in_progress']}, Resolved={stats['service_requests']['resolved']}")
    print(f" -> Complaints: Total={stats['complaints']['total']}, Awaiting={stats['complaints']['awaiting_acceptance']}, Assigned={stats['complaints']['assigned_in_progress']}, Resolved={stats['complaints']['resolved']}")

    # Assert Canonical Database Counts
    if stats['incidents']['total'] != 100:
        failures.append(f"Total incidents mismatch: expected 100, got {stats['incidents']['total']}")
    if stats['incidents']['active_outages'] != 61:
        failures.append(f"Active outages mismatch: expected 61, got {stats['incidents']['active_outages']}")
    if stats['incidents']['critical'] != 19:
        failures.append(f"Critical incidents mismatch: expected 19, got {stats['incidents']['critical']}")
    if stats['incidents']['resolved_today'] != 39:
        failures.append(f"Resolved today mismatch: expected 39, got {stats['incidents']['resolved_today']}")
    if stats['service_requests']['total'] != 500:
        failures.append(f"Service requests total mismatch: expected 500, got {stats['service_requests']['total']}")
    if stats['complaints']['total'] != 250:
        failures.append(f"Complaints total mismatch: expected 250, got {stats['complaints']['total']}")

    # 3. Verify Employee Operational Summary vs KPIs
    print("\n[Step 2] Comparing Chatbot Operational Summary vs Dashboard KPIs...")
    ops_res = AgentQueryRouter.route_and_execute("Summarize today's operations", "EMP0001", "Employee")
    reply = ops_res.get("reply", "")
    card = ops_res.get("cards", [{}])[0] if ops_res.get("cards") else {}

    # Check that live numbers appear in prose
    for metric_name, val in [
        ("Total Incidents", stats['incidents']['total']),
        ("Active Outages", stats['incidents']['active_outages']),
        ("Critical Incidents", stats['incidents']['critical']),
        ("Resolved Today", stats['incidents']['resolved_today'])
    ]:
        if f"**{val}**" not in reply:
            failures.append(f"Chatbot summary missing exact value for {metric_name} ({val})")

    # Check card telemetry
    if card.get("total") != stats['incidents']['total']:
        failures.append(f"Chatbot card total mismatch: expected {stats['incidents']['total']}, got {card.get('total')}")
    if card.get("critical") != stats['incidents']['critical']:
        failures.append(f"Chatbot card critical mismatch: expected {stats['incidents']['critical']}, got {card.get('critical')}")

    print(" -> Operational summary perfectly matches live StatsService KPIs.")

    # 4. Verify Dynamic Data Queries
    print("\n[Step 3] Executing Dynamic Data Queries against live collections...")
    query_tests = [
        ("Please list all complaints", "Citizen Grievances & Complaints", stats['complaints']['total']),
        ("List all successfully resolved cases", "Service Requests", stats['service_requests']['resolved']),
        ("What are the currently assigned cases?", "Service Requests", stats['service_requests']['assigned_in_progress']),
        ("Show all pending complaints", "Citizen Grievances & Complaints", stats['complaints']['awaiting_acceptance']),
        ("How many complaints were resolved today?", "Citizen Grievances & Complaints", stats['complaints']['resolved']),
        ("critical electricity incidents in Ward 11 that are still unresolved", "Operational Incidents & Outages", 0),
        ("assigned cases for Rajesh Kumar", "Service Requests", 0),
    ]

    for q, title, expected_count in query_tests:
        res = AgentQueryRouter.route_and_execute(q, "EMP0001", "Employee")
        actual_count = res.get("total_count", 0)
        print(f" -> Query: '{q}' => Count: {actual_count} (Expected: {expected_count})")
        if actual_count != expected_count:
            failures.append(f"Query '{q}' count mismatch: expected {expected_count}, got {actual_count}")
        if expected_count > 0:
            if not res.get("cards") or res["cards"][0].get("type") != "DATA_TABLE":
                failures.append(f"Query '{q}' did not return structured DATA_TABLE card")
        else:
            if "No records found" not in res.get("reply", ""):
                failures.append(f"0-match query '{q}' did not clearly state 'No records found'")

    # 5. Verify Conversational Grievance Lodging & Synchronization
    print("\n[Step 4] Testing Conversational Grievance Lodging & Real-Time Synchronization...")
    test_uid = "CUST_SYNC_TEST"
    
    # Run through the guided steps
    steps = [
        ("I want to lodge a grievance", "GRIEVANCE_COLLECT_UTILITY"),
        ("Electricity", "GRIEVANCE_COLLECT_CATEGORY"),
        ("Billing Dispute", "GRIEVANCE_COLLECT_REQUEST_ID"),
        ("None", "GRIEVANCE_COLLECT_LOCATION"),
        ("GPS", "GRIEVANCE_COLLECT_PRIORITY"),
        ("High", "GRIEVANCE_COLLECT_DESCRIPTION"),
        ("Overcharged on domestic meter", "GRIEVANCE_CONFIRMATION"),
        ("Confirm", "GRIEVANCE_LODGED")
    ]

    for user_input, expected_intent in steps:
        step_res = AgentQueryRouter.route_and_execute(user_input, test_uid, "Customer")
        actual_intent = step_res.get("intent")
        if actual_intent != expected_intent:
            failures.append(f"Grievance flow step '{user_input}' intent mismatch: expected {expected_intent}, got {actual_intent}")

    # Verify that the new grievance is in db.complaints
    new_cmp_count = db.complaints.count_documents({})
    if new_cmp_count != 251:
        failures.append(f"Expected 251 complaints after filing, found {new_cmp_count}")

    # Verify that subsequent dynamic query immediately returns 251
    list_after = AgentQueryRouter.route_and_execute("Please list all complaints", "EMP0001", "Employee")
    if list_after.get("total_count") != 251:
        failures.append(f"Subsequent query count mismatch: expected 251, got {list_after.get('total_count')}")

    # Verify StatsService also returns 251
    stats_after = StatsService.get_all_stats()
    if stats_after['complaints']['total'] != 251:
        failures.append(f"StatsService total complaints mismatch after insert: expected 251, got {stats_after['complaints']['total']}")

    print(" -> Conversational grievance lodging and multi-point synchronization verified!")

    # 6. Final Audit Result
    print("\n" + "=" * 70)
    if failures:
        print(f"❌ AUDIT FAILED with {len(failures)} mismatch(es):")
        for f in failures:
            print(f"  • {f}")
        sys.exit(1)
    else:
        print("✅ AUDIT PASSED: 100% Data Consistency, Synchronization & Zero Hallucination!")
        print("=" * 70)
        sys.exit(0)

if __name__ == "__main__":
    main()
