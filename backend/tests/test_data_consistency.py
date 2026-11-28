import unittest
import sys
import os

# Ensure backend directory is in python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database.mongo import DatabaseManager, get_database
from app.services.stats_service import StatsService
from app.agents.router import AgentQueryRouter

class TestDataConsistencyAndChatbot(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        DatabaseManager().seed_data()
        cls.db = get_database()

    def test_single_source_of_truth_kpis(self):
        """Dashboard KPIs, chatbot, and summary must all use StatsService numbers."""
        stats = StatsService.get_all_stats()
        self.assertIn("date", stats)
        self.assertEqual(stats["incidents"]["total"], 100)
        self.assertEqual(stats["incidents"]["active_outages"], 61)
        self.assertEqual(stats["incidents"]["critical"], 19)
        self.assertEqual(stats["incidents"]["resolved_today"], 39)
        self.assertEqual(stats["service_requests"]["total"], 500)
        self.assertEqual(stats["service_requests"]["awaiting_acceptance"], 92)
        self.assertEqual(stats["service_requests"]["assigned_in_progress"], 108)
        self.assertEqual(stats["service_requests"]["resolved"], 112)
        self.assertGreaterEqual(stats["complaints"]["total"], 250)

    def test_employee_operational_summary_matches_stats(self):
        """AI Summary must strictly reflect live stats with zero hallucination."""
        stats = StatsService.get_all_stats()
        res = AgentQueryRouter.route_and_execute("Summarize today's operations", "EMP0001", "Employee")
        reply = res["reply"]
        
        # Numbers must appear directly in formatted markdown
        self.assertIn(f"**{stats['incidents']['total']}**", reply)
        self.assertIn(f"**{stats['incidents']['active_outages']}**", reply)
        self.assertIn(f"**{stats['incidents']['critical']}**", reply)
        self.assertIn(f"**{stats['incidents']['resolved_today']}**", reply)
        self.assertIn(stats["date"], reply)

    def test_dynamic_query_all_complaints(self):
        """'Please list all complaints' dynamically fetches exact count."""
        stats = StatsService.get_all_stats()
        res = AgentQueryRouter.route_and_execute("Please list all complaints", "EMP0001", "Employee")
        self.assertEqual(res["total_count"], stats["complaints"]["total"])
        self.assertEqual(res["intent"], "DYNAMIC_DATA_QUERY")
        self.assertTrue(len(res["cards"]) > 0)
        self.assertEqual(res["cards"][0]["type"], "DATA_TABLE")

    def test_dynamic_query_resolved_cases(self):
        """'List all successfully resolved cases' filters by resolved status."""
        stats = StatsService.get_all_stats()
        res = AgentQueryRouter.route_and_execute("List all successfully resolved cases", "EMP0001", "Employee")
        self.assertEqual(res["total_count"], stats["service_requests"]["resolved"])
        self.assertEqual(res["intent"], "DYNAMIC_DATA_QUERY")

    def test_dynamic_query_assigned_cases(self):
        """'What are the currently assigned cases?' filters by assigned status."""
        stats = StatsService.get_all_stats()
        res = AgentQueryRouter.route_and_execute("What are the currently assigned cases?", "EMP0001", "Employee")
        self.assertEqual(res["total_count"], stats["service_requests"]["assigned_in_progress"])
        self.assertEqual(res["intent"], "DYNAMIC_DATA_QUERY")

    def test_dynamic_query_pending_complaints(self):
        """'Show all pending complaints' filters by pending status."""
        stats = StatsService.get_all_stats()
        res = AgentQueryRouter.route_and_execute("Show all pending complaints", "EMP0001", "Employee")
        self.assertEqual(res["total_count"], stats["complaints"]["awaiting_acceptance"])
        self.assertEqual(res["intent"], "DYNAMIC_DATA_QUERY")

    def test_complex_query_unresolved_ward11_incidents(self):
        """Combined filters: critical electricity incidents in Ward 11 that are still unresolved."""
        res = AgentQueryRouter.route_and_execute("critical electricity incidents in Ward 11 that are still unresolved", "EMP0001", "Employee")
        self.assertEqual(res["total_count"], 0)
        self.assertEqual(res["intent"], "DYNAMIC_QUERY_EMPTY")
        self.assertIn("No records found", res["reply"])

    def test_complex_query_assigned_to_person(self):
        """Combined filters: assigned cases for Rajesh Kumar."""
        res = AgentQueryRouter.route_and_execute("assigned cases for Rajesh Kumar", "EMP0001", "Employee")
        self.assertEqual(res["total_count"], 0)
        self.assertEqual(res["intent"], "DYNAMIC_QUERY_EMPTY")
        self.assertIn("No records found", res["reply"])

    def test_dynamic_query_electricity_complaints(self):
        """'Show all electricity complaints' dynamically filters by electricity utility."""
        res = AgentQueryRouter.route_and_execute("Show all electricity complaints", "EMP0001", "Employee")
        self.assertIn(res["intent"], ["DYNAMIC_DATA_QUERY", "DYNAMIC_QUERY_EMPTY"])
        self.assertIn("complaints", res["citations"][0]["document_name"].lower())

    def test_dynamic_query_how_many_resolved_today(self):
        """'How many complaints were resolved today?' returns exact count from Single Source of Truth."""
        stats = StatsService.get_all_stats()
        res = AgentQueryRouter.route_and_execute("How many complaints were resolved today?", "EMP0001", "Employee")
        self.assertEqual(res["intent"], "DYNAMIC_DATA_QUERY")
        self.assertEqual(res["total_count"], stats["complaints"]["resolved"])
        self.assertIn(f"**{stats['complaints']['resolved']}**", res["reply"])

    def test_dynamic_query_assigned_technician(self):
        """'Show complaints assigned to a particular technician' handles technician queries."""
        res = AgentQueryRouter.route_and_execute("Show complaints assigned to a particular technician", "EMP0001", "Employee")
        self.assertEqual(res["intent"], "DYNAMIC_DATA_QUERY")
        self.assertTrue(len(res["cards"]) > 0)

    def test_conversational_grievance_lodging_and_sync(self):
        """Grievances filed via conversational chatbot immediately appear in counts."""
        initial_stats = StatsService.get_all_stats()
        initial_complaints = initial_stats["complaints"]["total"]

        uid = "CUST_TEST_RUNNER"
        # 1. Start flow
        r1 = AgentQueryRouter.route_and_execute("I want to file a complaint", uid, "Customer")
        self.assertEqual(r1["intent"], "GRIEVANCE_COLLECT_UTILITY")

        # 2. Collect utility
        r2 = AgentQueryRouter.route_and_execute("Electricity", uid, "Customer")
        self.assertEqual(r2["intent"], "GRIEVANCE_COLLECT_CATEGORY")

        # 3. Collect category
        r3 = AgentQueryRouter.route_and_execute("Billing Dispute", uid, "Customer")
        self.assertEqual(r3["intent"], "GRIEVANCE_COLLECT_REQUEST_ID")

        # 4. Optional Request ID
        r4 = AgentQueryRouter.route_and_execute("None", uid, "Customer")
        self.assertEqual(r4["intent"], "GRIEVANCE_COLLECT_LOCATION")

        # 5. Location / GPS
        r5 = AgentQueryRouter.route_and_execute("GPS", uid, "Customer")
        self.assertEqual(r5["intent"], "GRIEVANCE_COLLECT_PRIORITY")

        # 6. Priority
        r6 = AgentQueryRouter.route_and_execute("High", uid, "Customer")
        self.assertEqual(r6["intent"], "GRIEVANCE_COLLECT_DESCRIPTION")

        # 7. Description
        r7 = AgentQueryRouter.route_and_execute("Meter calculation discrepancy detected on bill", uid, "Customer")
        self.assertEqual(r7["intent"], "GRIEVANCE_CONFIRMATION")

        # 8. Confirmation
        r8 = AgentQueryRouter.route_and_execute("Confirm", uid, "Customer")
        self.assertEqual(r8["intent"], "GRIEVANCE_LODGED")
        self.assertIn("Submitted", r8["reply"])

        # 9. Verify immediate synchronization across query and stats
        post_stats = StatsService.get_all_stats()
        self.assertEqual(post_stats["complaints"]["total"], initial_complaints + 1)

        list_res = AgentQueryRouter.route_and_execute("Please list all complaints", "EMP0001", "Employee")
        self.assertEqual(list_res["total_count"], initial_complaints + 1)

if __name__ == "__main__":
    unittest.main()
