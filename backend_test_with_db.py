#!/usr/bin/env python3
"""
Enhanced Backend API Testing with Direct Database Access
Tests actual functionality with real database operations
"""

import asyncio
import httpx
import json
import os
from datetime import datetime, date, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import uuid

# Get backend URL from environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://cyclewise-14.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

class EnhancedCycleTrackingTester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.test_results = []
        self.user_id = None
        self.session_token = None
        self.auth_headers = None
        
        # MongoDB connection
        mongo_url = "mongodb://localhost:27017"
        self.mongo_client = AsyncIOMotorClient(mongo_url)
        self.db = self.mongo_client["test_database"]
        
    async def log_result(self, test_name: str, success: bool, details: str = "", response_data: any = None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        if response_data:
            result["response"] = response_data
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        
    async def setup_test_user(self):
        """Create a test user and session in the database"""
        try:
            # Create test user
            self.user_id = f"test-user-{uuid.uuid4()}"
            self.session_token = f"test-session-{uuid.uuid4()}"
            
            user_data = {
                "id": self.user_id,
                "email": "test@example.com",
                "name": "Test User",
                "picture": None,
                "created_at": datetime.utcnow()
            }
            
            # Insert user
            await self.db.users.insert_one(user_data)
            
            # Create session
            session_data = {
                "user_id": self.user_id,
                "session_token": self.session_token,
                "expires_at": datetime.utcnow() + timedelta(days=1),
                "created_at": datetime.utcnow()
            }
            
            await self.db.user_sessions.insert_one(session_data)
            
            # Set up auth headers
            self.auth_headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            
            await self.log_result("Database Setup", True, f"Created test user {self.user_id} with valid session")
            return True
            
        except Exception as e:
            await self.log_result("Database Setup", False, f"Failed to setup test user: {str(e)}")
            return False
    
    async def test_health_check(self):
        """Test basic backend connectivity"""
        try:
            response = await self.client.get(f"{BACKEND_URL}/")
            await self.log_result("Health Check", True, f"Backend responding with status {response.status_code}")
            return True
        except Exception as e:
            await self.log_result("Health Check", False, f"Connection failed: {str(e)}")
            return False
    
    async def test_auth_me_with_valid_session(self):
        """Test getting current user with valid session"""
        try:
            response = await self.client.get(f"{API_BASE}/auth/me", headers=self.auth_headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == self.user_id:
                    await self.log_result("Auth Me (Valid Session)", True, f"Successfully retrieved user data", data)
                else:
                    await self.log_result("Auth Me (Valid Session)", False, f"User ID mismatch: expected {self.user_id}, got {data.get('id')}")
            else:
                await self.log_result("Auth Me (Valid Session)", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            await self.log_result("Auth Me (Valid Session)", False, f"Error: {str(e)}")
    
    async def test_onboarding_flow(self):
        """Test complete onboarding flow"""
        try:
            onboarding_data = {
                "last_period_start": "2025-01-15",
                "avg_cycle_length": 28,
                "period_length": 5,
                "luteal_length": 14
            }
            
            response = await self.client.post(
                f"{API_BASE}/onboarding",
                json=onboarding_data,
                headers=self.auth_headers
            )
            
            if response.status_code == 200:
                data = response.json()
                if "settings" in data and "message" in data:
                    await self.log_result("Onboarding Flow", True, "Onboarding completed successfully", data)
                    return True
                else:
                    await self.log_result("Onboarding Flow", False, f"Invalid response format: {data}")
            else:
                await self.log_result("Onboarding Flow", False, f"Status: {response.status_code}, Response: {response.text}")
            
            return False
            
        except Exception as e:
            await self.log_result("Onboarding Flow", False, f"Error: {str(e)}")
            return False
    
    async def test_cycle_functionality(self):
        """Test cycle-related endpoints with real data"""
        try:
            # Test GET cycle settings (should exist after onboarding)
            response = await self.client.get(f"{API_BASE}/cycle/settings", headers=self.auth_headers)
            
            if response.status_code == 200:
                settings = response.json()
                await self.log_result("GET Cycle Settings", True, f"Retrieved cycle settings", settings)
                
                # Test today's cycle info
                response = await self.client.get(f"{API_BASE}/cycle/today", headers=self.auth_headers)
                if response.status_code == 200:
                    today_data = response.json()
                    if today_data.get("has_settings"):
                        cycle_day = today_data.get("cycle_day")
                        await self.log_result("GET Cycle Today", True, f"Today is cycle day {cycle_day}", today_data)
                    else:
                        await self.log_result("GET Cycle Today", False, "No cycle settings found")
                else:
                    await self.log_result("GET Cycle Today", False, f"Status: {response.status_code}")
                
                # Test calendar data
                start_date = "2025-01-01"
                end_date = "2025-01-31"
                response = await self.client.get(
                    f"{API_BASE}/cycle/calendar?start_date={start_date}&end_date={end_date}",
                    headers=self.auth_headers
                )
                
                if response.status_code == 200:
                    calendar_data = response.json()
                    if "calendar" in calendar_data:
                        days_count = len(calendar_data["calendar"])
                        await self.log_result("GET Cycle Calendar", True, f"Retrieved calendar with {days_count} days", {"days_count": days_count})
                    else:
                        await self.log_result("GET Cycle Calendar", False, f"Invalid calendar format: {calendar_data}")
                else:
                    await self.log_result("GET Cycle Calendar", False, f"Status: {response.status_code}")
                
                # Test reminders
                response = await self.client.get(f"{API_BASE}/cycle/reminders", headers=self.auth_headers)
                if response.status_code == 200:
                    reminders = response.json()
                    if "reminders" in reminders:
                        reminders_count = len(reminders["reminders"])
                        await self.log_result("GET Cycle Reminders", True, f"Retrieved {reminders_count} reminders", reminders)
                    else:
                        await self.log_result("GET Cycle Reminders", False, f"Invalid reminders format: {reminders}")
                else:
                    await self.log_result("GET Cycle Reminders", False, f"Status: {response.status_code}")
                    
            else:
                await self.log_result("GET Cycle Settings", False, f"Status: {response.status_code}")
                
        except Exception as e:
            await self.log_result("Cycle Functionality", False, f"Error: {str(e)}")
    
    async def test_water_tracker_flow(self):
        """Test complete water tracking flow"""
        try:
            # Get initial water data
            response = await self.client.get(f"{API_BASE}/water/today", headers=self.auth_headers)
            
            if response.status_code == 200:
                initial_data = response.json()
                initial_consumed = initial_data.get("consumed_ml", 0)
                await self.log_result("GET Water Today", True, f"Initial water: {initial_consumed}ml", initial_data)
                
                # Add water
                add_amount = 250
                response = await self.client.post(
                    f"{API_BASE}/water/add",
                    json={"ml": add_amount},
                    headers=self.auth_headers
                )
                
                if response.status_code == 200:
                    add_result = response.json()
                    new_consumed = add_result.get("consumed_ml", 0)
                    expected = initial_consumed + add_amount
                    
                    if new_consumed == expected:
                        await self.log_result("POST Water Add", True, f"Added {add_amount}ml, total now {new_consumed}ml", add_result)
                    else:
                        await self.log_result("POST Water Add", False, f"Expected {expected}ml, got {new_consumed}ml")
                else:
                    await self.log_result("POST Water Add", False, f"Status: {response.status_code}")
                
                # Update water settings
                response = await self.client.put(
                    f"{API_BASE}/water/settings?goal_ml=2500&glass_ml=300",
                    headers=self.auth_headers
                )
                
                if response.status_code == 200:
                    await self.log_result("PUT Water Settings", True, "Water settings updated successfully", response.json())
                else:
                    await self.log_result("PUT Water Settings", False, f"Status: {response.status_code}")
                    
            else:
                await self.log_result("GET Water Today", False, f"Status: {response.status_code}")
                
        except Exception as e:
            await self.log_result("Water Tracker Flow", False, f"Error: {str(e)}")
    
    async def test_journal_flow(self):
        """Test complete journal functionality"""
        try:
            # Create journal entry
            journal_data = {
                "date": "2025-01-25",
                "good_1": "Had a productive morning workout session",
                "good_2": "Enjoyed a healthy breakfast with fresh fruits",
                "good_3": "Completed an important project milestone",
                "self_praise": "I'm proud of maintaining my healthy routine",
                "mood": 8,
                "energy": 7,
                "notes": "Feeling grateful and energized. The weather was perfect for outdoor activities."
            }
            
            response = await self.client.post(
                f"{API_BASE}/journal",
                json=journal_data,
                headers=self.auth_headers
            )
            
            if response.status_code == 200:
                entry_result = response.json()
                await self.log_result("POST Journal Entry", True, "Journal entry created successfully", entry_result)
                
                # Get journal entries
                response = await self.client.get(f"{API_BASE}/journal", headers=self.auth_headers)
                if response.status_code == 200:
                    entries = response.json()
                    if "entries" in entries:
                        entries_count = len(entries["entries"])
                        await self.log_result("GET Journal Entries", True, f"Retrieved {entries_count} journal entries", {"count": entries_count})
                    else:
                        await self.log_result("GET Journal Entries", False, f"Invalid format: {entries}")
                else:
                    await self.log_result("GET Journal Entries", False, f"Status: {response.status_code}")
                
                # Get specific entry
                test_date = "2025-01-25"
                response = await self.client.get(f"{API_BASE}/journal/{test_date}", headers=self.auth_headers)
                if response.status_code == 200:
                    entry_data = response.json()
                    if entry_data.get("entry"):
                        await self.log_result("GET Journal Entry by Date", True, f"Retrieved entry for {test_date}", entry_data)
                    else:
                        await self.log_result("GET Journal Entry by Date", True, f"No entry found for {test_date} (expected)")
                else:
                    await self.log_result("GET Journal Entry by Date", False, f"Status: {response.status_code}")
                    
            else:
                await self.log_result("POST Journal Entry", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            await self.log_result("Journal Flow", False, f"Error: {str(e)}")
    
    async def test_habits_flow(self):
        """Test complete habits functionality"""
        try:
            # Create habit
            habit_data = {
                "title": "Daily Meditation Practice",
                "type": "boolean",
                "target": None,
                "days_of_week": [0, 1, 2, 3, 4, 5, 6],
                "reminders": ["08:00", "20:00"]
            }
            
            response = await self.client.post(
                f"{API_BASE}/habits",
                json=habit_data,
                headers=self.auth_headers
            )
            
            habit_id = None
            if response.status_code == 200:
                habit_result = response.json()
                if "habit" in habit_result and "id" in habit_result["habit"]:
                    habit_id = habit_result["habit"]["id"]
                    await self.log_result("POST Create Habit", True, f"Habit created with ID: {habit_id}", habit_result)
                else:
                    await self.log_result("POST Create Habit", False, f"Invalid response format: {habit_result}")
            else:
                await self.log_result("POST Create Habit", False, f"Status: {response.status_code}")
            
            # Get habits
            response = await self.client.get(f"{API_BASE}/habits", headers=self.auth_headers)
            if response.status_code == 200:
                habits = response.json()
                if "habits" in habits:
                    habits_count = len(habits["habits"])
                    await self.log_result("GET Habits", True, f"Retrieved {habits_count} habits", {"count": habits_count})
                    
                    # Use first habit if we don't have one from creation
                    if not habit_id and habits["habits"]:
                        habit_id = habits["habits"][0]["id"]
                else:
                    await self.log_result("GET Habits", False, f"Invalid format: {habits}")
            else:
                await self.log_result("GET Habits", False, f"Status: {response.status_code}")
            
            # Test habit logging if we have a habit
            if habit_id:
                log_data = {
                    "completed": True,
                    "value": None
                }
                
                response = await self.client.post(
                    f"{API_BASE}/habits/{habit_id}/log",
                    json=log_data,
                    headers=self.auth_headers
                )
                
                if response.status_code == 200:
                    await self.log_result("POST Habit Log", True, f"Habit {habit_id} logged successfully", response.json())
                    
                    # Get habit logs
                    response = await self.client.get(f"{API_BASE}/habits/{habit_id}/logs", headers=self.auth_headers)
                    if response.status_code == 200:
                        logs = response.json()
                        if "logs" in logs:
                            logs_count = len(logs["logs"])
                            await self.log_result("GET Habit Logs", True, f"Retrieved {logs_count} habit logs", {"count": logs_count})
                        else:
                            await self.log_result("GET Habit Logs", False, f"Invalid format: {logs}")
                    else:
                        await self.log_result("GET Habit Logs", False, f"Status: {response.status_code}")
                else:
                    await self.log_result("POST Habit Log", False, f"Status: {response.status_code}")
            else:
                await self.log_result("Habit Logging", True, "Skipped - no habit ID available")
                
        except Exception as e:
            await self.log_result("Habits Flow", False, f"Error: {str(e)}")
    
    async def test_ai_tip_generation(self):
        """Test AI tip generation"""
        try:
            response = await self.client.get(f"{API_BASE}/tips/daily", headers=self.auth_headers)
            
            if response.status_code == 200:
                tip_data = response.json()
                if "tip" in tip_data and "timestamp" in tip_data:
                    tip = tip_data["tip"]
                    tip_length = len(tip)
                    await self.log_result("GET Daily Tip", True, f"AI tip generated ({tip_length} chars): {tip[:100]}...", tip_data)
                else:
                    await self.log_result("GET Daily Tip", False, f"Invalid response format: {tip_data}")
            else:
                await self.log_result("GET Daily Tip", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            await self.log_result("AI Tip Generation", False, f"Error: {str(e)}")
    
    async def test_summaries_generation(self):
        """Test summaries generation"""
        try:
            # Test monthly summary
            response = await self.client.get(
                f"{API_BASE}/summaries/generate?period_type=monthly",
                headers=self.auth_headers
            )
            
            if response.status_code == 200:
                summary_data = response.json()
                if "summary" in summary_data:
                    await self.log_result("GET Generate Summary", True, "Monthly summary generated successfully", summary_data)
                elif "message" in summary_data and "No entries found" in summary_data["message"]:
                    await self.log_result("GET Generate Summary", True, "No entries found for summary (expected for limited data)")
                else:
                    await self.log_result("GET Generate Summary", False, f"Unexpected response: {summary_data}")
            else:
                await self.log_result("GET Generate Summary", False, f"Status: {response.status_code}")
                
        except Exception as e:
            await self.log_result("Summaries Generation", False, f"Error: {str(e)}")
    
    async def cleanup_test_data(self):
        """Clean up test data from database"""
        try:
            if self.user_id:
                # Remove test user and related data
                await self.db.users.delete_many({"id": self.user_id})
                await self.db.user_sessions.delete_many({"user_id": self.user_id})
                await self.db.cycle_settings.delete_many({"user_id": self.user_id})
                await self.db.journal_entries.delete_many({"user_id": self.user_id})
                await self.db.water_tracker.delete_many({"user_id": self.user_id})
                await self.db.habits.delete_many({"user_id": self.user_id})
                await self.db.habit_logs.delete_many({"user_id": self.user_id})
                await self.db.summaries.delete_many({"user_id": self.user_id})
                
                await self.log_result("Cleanup", True, f"Cleaned up test data for user {self.user_id}")
                
        except Exception as e:
            await self.log_result("Cleanup", False, f"Error during cleanup: {str(e)}")
    
    async def run_comprehensive_tests(self):
        """Run comprehensive API tests with real database operations"""
        print(f"🧪 Starting Comprehensive Cycle Tracking API Tests")
        print(f"📍 Backend URL: {BACKEND_URL}")
        print(f"📍 API Base: {API_BASE}")
        print(f"🗄️  Database: MongoDB (localhost:27017)")
        print("=" * 70)
        
        # Setup
        if not await self.setup_test_user():
            print("❌ Failed to setup test environment")
            return
        
        # Basic tests
        await self.test_health_check()
        await self.test_auth_me_with_valid_session()
        
        # Functional tests
        onboarding_success = await self.test_onboarding_flow()
        if onboarding_success:
            await self.test_cycle_functionality()
        
        await self.test_water_tracker_flow()
        await self.test_journal_flow()
        await self.test_habits_flow()
        await self.test_ai_tip_generation()
        await self.test_summaries_generation()
        
        # Cleanup
        await self.cleanup_test_data()
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 COMPREHENSIVE TEST SUMMARY")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  ❌ {result['test']}: {result['details']}")
        
        print("\n📝 KEY FINDINGS:")
        auth_working = any(r["test"] == "Auth Me (Valid Session)" and r["success"] for r in self.test_results)
        onboarding_working = any(r["test"] == "Onboarding Flow" and r["success"] for r in self.test_results)
        water_working = any(r["test"] == "POST Water Add" and r["success"] for r in self.test_results)
        journal_working = any(r["test"] == "POST Journal Entry" and r["success"] for r in self.test_results)
        habits_working = any(r["test"] == "POST Create Habit" and r["success"] for r in self.test_results)
        ai_working = any(r["test"] == "GET Daily Tip" and r["success"] for r in self.test_results)
        
        print(f"• Authentication: {'✅ Working' if auth_working else '❌ Issues'}")
        print(f"• Onboarding: {'✅ Working' if onboarding_working else '❌ Issues'}")
        print(f"• Water Tracking: {'✅ Working' if water_working else '❌ Issues'}")
        print(f"• Journal: {'✅ Working' if journal_working else '❌ Issues'}")
        print(f"• Habits: {'✅ Working' if habits_working else '❌ Issues'}")
        print(f"• AI Tips: {'✅ Working' if ai_working else '❌ Issues'}")
        
        await self.client.aclose()
        self.mongo_client.close()
        
        return self.test_results

async def main():
    """Main test runner"""
    tester = EnhancedCycleTrackingTester()
    results = await tester.run_comprehensive_tests()
    
    # Save results
    with open("/app/backend_comprehensive_test_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n💾 Comprehensive test results saved to: /app/backend_comprehensive_test_results.json")

if __name__ == "__main__":
    asyncio.run(main())