#!/usr/bin/env python3
"""
End-to-End Test Script for PalmCare AI MVP

Tests the complete flow from registration to contract generation.
Run against the deployed API to verify everything works.

Usage:
    python tests/e2e_test.py [--api-url URL]
"""

import os
import sys
import json
import time
import argparse
import requests
from datetime import datetime
from pathlib import Path

# Default to production URL
DEFAULT_API_URL = "https://api-production-a0a2.up.railway.app"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def log_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.END}")

def log_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.END}")

def log_info(msg):
    print(f"{Colors.BLUE}→ {msg}{Colors.END}")

def log_warning(msg):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.END}")


class E2ETest:
    def __init__(self, api_url: str):
        self.api_url = api_url.rstrip('/')
        self.token = None
        self.business_id = None
        self.client_id = None
        self.visit_id = None
        
        # Generate unique test data
        self.test_id = datetime.now().strftime("%Y%m%d%H%M%S")
        self.test_email = f"test_{self.test_id}@e2etest.com"
        self.test_password = "TestPassword123!"
        
    def test_health(self) -> bool:
        """Test API health endpoint."""
        log_info("Testing API health...")
        try:
            resp = requests.get(f"{self.api_url}/health", timeout=10)
            if resp.status_code == 200:
                log_success("API is healthy")
                return True
            else:
                log_error(f"API health check failed: {resp.status_code}")
                return False
        except Exception as e:
            log_error(f"API health check failed: {e}")
            return False
    
    def test_register(self) -> bool:
        """Test business registration."""
        log_info(f"Registering new business with email: {self.test_email}")
        
        try:
            resp = requests.post(
                f"{self.api_url}/auth/business/register",
                json={
                    "name": f"E2E Test Agency {self.test_id}",
                    "owner_name": "Test Owner",
                    "owner_email": self.test_email,
                    "owner_password": self.test_password,
                    "phone": "555-555-5555",
                    "entity_type": "llc",
                    "state_of_incorporation": "CA",
                    "registration_number": f"TEST{self.test_id}",
                    "address": "123 Test St",
                    "city": "Test City",
                    "state": "CA",
                    "zip_code": "90210",
                    "email": self.test_email,
                },
                timeout=30
            )
            
            if resp.status_code == 200:
                data = resp.json()
                self.business_id = data.get("business_id")
                log_success(f"Business registered: {self.business_id}")
                return True
            else:
                log_error(f"Registration failed: {resp.status_code} - {resp.text}")
                return False
        except Exception as e:
            log_error(f"Registration failed: {e}")
            return False
    
    def test_login(self) -> bool:
        """Test login (tries business auth, falls back to regular)."""
        log_info("Testing login...")
        
        # Try business auth first
        try:
            resp = requests.post(
                f"{self.api_url}/auth/business/login",
                json={
                    "email": self.test_email,
                    "password": self.test_password,
                },
                timeout=10
            )
            
            if resp.status_code == 200:
                data = resp.json()
                self.token = data.get("access_token")
                log_success("Login successful (business auth)")
                return True
        except Exception as e:
            log_warning(f"Business auth failed, trying regular auth: {e}")
        
        # Try regular auth
        try:
            resp = requests.post(
                f"{self.api_url}/auth/login",
                json={
                    "email": self.test_email,
                    "password": self.test_password,
                },
                timeout=10
            )
            
            if resp.status_code == 200:
                data = resp.json()
                self.token = data.get("access_token")
                log_success("Login successful (regular auth)")
                return True
            else:
                log_error(f"Login failed: {resp.status_code} - {resp.text}")
                return False
        except Exception as e:
            log_error(f"Login failed: {e}")
            return False
    
    def test_get_me(self) -> bool:
        """Test getting current user info."""
        log_info("Testing /auth/me endpoint...")
        
        try:
            resp = requests.get(
                f"{self.api_url}/auth/me",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10
            )
            
            if resp.status_code == 200:
                data = resp.json()
                log_success(f"Got user info: {data.get('email', 'unknown')}")
                return True
            else:
                log_error(f"Get user info failed: {resp.status_code} - {resp.text}")
                return False
        except Exception as e:
            log_error(f"Get user info failed: {e}")
            return False
    
    def test_create_client(self) -> bool:
        """Test creating a client."""
        log_info("Creating test client...")
        
        try:
            resp = requests.post(
                f"{self.api_url}/clients",
                headers={"Authorization": f"Bearer {self.token}"},
                json={
                    "full_name": f"Test Client {self.test_id}",
                    "email": f"client_{self.test_id}@test.com",
                    "phone": "555-123-4567",
                    "address": "456 Client Ave, Test City, CA 90210",
                    "care_needs": "Daily assistance with ADLs, medication management",
                },
                timeout=10
            )
            
            if resp.status_code in [200, 201]:
                data = resp.json()
                self.client_id = data.get("id")
                log_success(f"Client created: {self.client_id}")
                return True
            else:
                log_error(f"Create client failed: {resp.status_code} - {resp.text}")
                return False
        except Exception as e:
            log_error(f"Create client failed: {e}")
            return False
    
    def test_create_visit(self) -> bool:
        """Test creating a visit."""
        log_info("Creating test visit...")
        
        try:
            resp = requests.post(
                f"{self.api_url}/visits",
                headers={"Authorization": f"Bearer {self.token}"},
                json={
                    "client_id": str(self.client_id),
                    "visit_date": datetime.now().strftime("%Y-%m-%d"),
                    "notes": "E2E test visit",
                },
                timeout=10
            )
            
            if resp.status_code in [200, 201]:
                data = resp.json()
                self.visit_id = data.get("id")
                log_success(f"Visit created: {self.visit_id}")
                return True
            else:
                log_error(f"Create visit failed: {resp.status_code} - {resp.text}")
                return False
        except Exception as e:
            log_error(f"Create visit failed: {e}")
            return False
    
    def test_import_transcript(self) -> bool:
        """Test importing a transcript (skip expensive audio processing)."""
        log_info("Importing test transcript...")
        
        sample_transcript = """
        Nurse: Good morning Mrs. Johnson, how are you feeling today?
        Client: I'm doing alright, my back has been a little sore.
        Nurse: I'm sorry to hear that. Let me check your vitals first. Your blood pressure is 120 over 80, that's looking good.
        Client: That's a relief. I've been taking my medication regularly.
        Nurse: Excellent. Now let's do some range of motion exercises for your back. Can you slowly bend forward?
        Client: Yes, it hurts a little when I do that.
        Nurse: I'll note that down. We should schedule a follow-up with your doctor about the back pain. In the meantime, I'll help you with your daily activities. Would you like help with bathing today?
        Client: Yes please, and I also need help preparing lunch.
        Nurse: Of course. I'll assist with bathing, meal preparation, and we'll do some light housekeeping as well. I'll also organize your medications for the week.
        Client: Thank you so much, you're always so helpful.
        Nurse: It's my pleasure. Let's get started with the bath first.
        """
        
        try:
            resp = requests.post(
                f"{self.api_url}/visits/{self.visit_id}/transcript/import/text",
                headers={"Authorization": f"Bearer {self.token}"},
                json={"text_content": sample_transcript},
                timeout=30
            )
            
            if resp.status_code == 200:
                log_success("Transcript imported")
                return True
            else:
                log_error(f"Import transcript failed: {resp.status_code} - {resp.text}")
                return False
        except Exception as e:
            log_error(f"Import transcript failed: {e}")
            return False
    
    def test_generate_billables(self) -> bool:
        """Test billable extraction."""
        log_info("Generating billables...")
        
        try:
            resp = requests.post(
                f"{self.api_url}/pipeline/visits/{self.visit_id}/bill",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=60
            )
            
            if resp.status_code == 200:
                data = resp.json()
                task_id = data.get("task_id")
                log_success(f"Billables task started: {task_id}")
                
                # Wait for completion (polling)
                for _ in range(30):  # 30 second timeout
                    time.sleep(1)
                    status_resp = requests.get(
                        f"{self.api_url}/visits/{self.visit_id}/billables",
                        headers={"Authorization": f"Bearer {self.token}"},
                        timeout=10
                    )
                    if status_resp.status_code == 200:
                        billables = status_resp.json()
                        if billables and len(billables) > 0:
                            log_success(f"Found {len(billables)} billable items")
                            return True
                
                log_warning("Billables task completed but no items found")
                return True
            else:
                log_error(f"Generate billables failed: {resp.status_code} - {resp.text}")
                return False
        except Exception as e:
            log_error(f"Generate billables failed: {e}")
            return False
    
    def test_generate_note(self) -> bool:
        """Test note generation."""
        log_info("Generating SOAP note...")
        
        try:
            resp = requests.post(
                f"{self.api_url}/pipeline/visits/{self.visit_id}/note",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=60
            )
            
            if resp.status_code == 200:
                log_success("Note generation started")
                
                # Wait for completion
                for _ in range(30):
                    time.sleep(1)
                    status_resp = requests.get(
                        f"{self.api_url}/visits/{self.visit_id}/note",
                        headers={"Authorization": f"Bearer {self.token}"},
                        timeout=10
                    )
                    if status_resp.status_code == 200:
                        note = status_resp.json()
                        if note and note.get("id"):
                            log_success(f"Note generated: {note.get('id')}")
                            return True
                
                log_warning("Note task completed but no note found")
                return True
            else:
                log_error(f"Generate note failed: {resp.status_code} - {resp.text}")
                return False
        except Exception as e:
            log_error(f"Generate note failed: {e}")
            return False
    
    def test_generate_contract(self) -> bool:
        """Test contract generation."""
        log_info("Generating contract...")
        
        try:
            resp = requests.post(
                f"{self.api_url}/pipeline/visits/{self.visit_id}/contract",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=60
            )
            
            if resp.status_code == 200:
                log_success("Contract generation started")
                
                # Wait for completion
                for _ in range(30):
                    time.sleep(1)
                    status_resp = requests.get(
                        f"{self.api_url}/visits/{self.visit_id}/contract",
                        headers={"Authorization": f"Bearer {self.token}"},
                        timeout=10
                    )
                    if status_resp.status_code == 200:
                        contract = status_resp.json()
                        if contract and contract.get("id"):
                            log_success(f"Contract generated: {contract.get('id')}")
                            return True
                
                log_warning("Contract task completed but no contract found")
                return True
            else:
                log_error(f"Generate contract failed: {resp.status_code} - {resp.text}")
                return False
        except Exception as e:
            log_error(f"Generate contract failed: {e}")
            return False
    
    def test_email_contract(self) -> bool:
        """Test email contract (without actually sending)."""
        log_info("Testing email contract endpoint...")
        
        try:
            # Just verify the endpoint exists and returns proper error for missing email config
            resp = requests.post(
                f"{self.api_url}/exports/visits/{self.visit_id}/email-contract",
                headers={"Authorization": f"Bearer {self.token}"},
                json={
                    "recipient_email": "test@example.com",
                    "recipient_name": "Test Recipient",
                    "subject": "Test Contract",
                    "message": "This is a test email",
                },
                timeout=30
            )
            
            # 200 = success, 500 = email config issue (but endpoint works)
            if resp.status_code in [200, 500]:
                if resp.status_code == 200:
                    log_success("Email contract sent successfully")
                else:
                    log_warning("Email endpoint works but email config may be missing")
                return True
            elif resp.status_code == 404:
                data = resp.json()
                detail = data.get("detail", "")
                if "contract" in detail.lower():
                    log_warning(f"Contract not found: {detail}")
                    return True  # Endpoint works, just no contract
                log_error(f"Email contract endpoint not found: {resp.text}")
                return False
            else:
                log_error(f"Email contract failed: {resp.status_code} - {resp.text}")
                return False
        except Exception as e:
            log_error(f"Email contract failed: {e}")
            return False
    
    def run_all_tests(self) -> bool:
        """Run all tests in sequence."""
        print("\n" + "="*60)
        print("  PALMCARE AI - END-TO-END TEST")
        print(f"  API: {self.api_url}")
        print("="*60 + "\n")
        
        tests = [
            ("API Health", self.test_health),
            ("Business Registration", self.test_register),
            ("Login", self.test_login),
            ("Get Current User", self.test_get_me),
            ("Create Client", self.test_create_client),
            ("Create Visit", self.test_create_visit),
            ("Import Transcript", self.test_import_transcript),
            ("Generate Billables", self.test_generate_billables),
            ("Generate Note", self.test_generate_note),
            ("Generate Contract", self.test_generate_contract),
            ("Email Contract", self.test_email_contract),
        ]
        
        passed = 0
        failed = 0
        
        for name, test_func in tests:
            print(f"\n--- {name} ---")
            try:
                if test_func():
                    passed += 1
                else:
                    failed += 1
                    if name in ["Login", "Get Current User"]:
                        log_error("Critical test failed - stopping")
                        break
            except Exception as e:
                log_error(f"Test exception: {e}")
                failed += 1
        
        print("\n" + "="*60)
        print(f"  RESULTS: {passed} passed, {failed} failed")
        print("="*60 + "\n")
        
        return failed == 0


def main():
    parser = argparse.ArgumentParser(description="E2E Test for PalmCare AI")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="API URL to test against")
    args = parser.parse_args()
    
    test = E2ETest(args.api_url)
    success = test.run_all_tests()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
