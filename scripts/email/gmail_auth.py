#!/usr/bin/env python3
"""
Gmail OAuth2 Authorization — One-time setup for AI Task Daemon.

Run this script to authorize the daemon to read your Gmail inbox.
It will open a browser window for Google OAuth consent, then save
the credentials to ~/.palmcare/gmail_token.json.

Usage:
    python3 scripts/gmail_auth.py
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

TOKEN_PATH = Path.home() / ".palmcare" / "gmail_token.json"
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.modify"]

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

if not CLIENT_ID or not CLIENT_SECRET:
    print("ERROR: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env")
    exit(1)

CLIENT_CONFIG = {
    "installed": {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": ["http://localhost:8090"],
    }
}


def authorize():
    creds = None

    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)

    if creds and creds.valid:
        print("Already authorized! Token is valid.")
        return creds

    if creds and creds.expired and creds.refresh_token:
        print("Refreshing expired token...")
        creds.refresh(Request())
    else:
        print("Starting OAuth flow...")
        print("A browser window will open. Sign in with museibrahim@palmtai.com")
        print()

        flow = InstalledAppFlow.from_client_config(CLIENT_CONFIG, SCOPES)
        creds = flow.run_local_server(port=8090, prompt="consent")

    TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
    TOKEN_PATH.write_text(creds.to_json())
    print(f"\nAuthorization successful! Token saved to {TOKEN_PATH}")
    return creds


if __name__ == "__main__":
    creds = authorize()

    from googleapiclient.discovery import build
    service = build("gmail", "v1", credentials=creds)
    profile = service.users().getProfile(userId="me").execute()
    print(f"Authorized as: {profile.get('emailAddress')}")
    print(f"Total messages: {profile.get('messagesTotal')}")
