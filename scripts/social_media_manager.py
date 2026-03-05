#!/usr/bin/env python3
"""
Social Media Manager — Post content to Twitter/X, LinkedIn, Instagram, and Facebook.

Reads API keys from environment variables. If a platform's keys are not configured,
posting to that platform is skipped with a warning.

Usage:
    from social_media_manager import SocialMediaManager
    sm = SocialMediaManager()
    sm.post_to_all("Check out PalmCare AI!", image_path="marketing/generated/hero.png")
"""

import os
import json
import logging
import time
import requests
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger("social_media_manager")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCHEDULED_DIR = PROJECT_ROOT / "marketing" / "scheduled-posts"


class TwitterClient:
    """Twitter/X API v2 client using OAuth 1.0a."""

    def __init__(self):
        self.api_key = os.getenv("TWITTER_API_KEY")
        self.api_secret = os.getenv("TWITTER_API_SECRET")
        self.access_token = os.getenv("TWITTER_ACCESS_TOKEN")
        self.access_secret = os.getenv("TWITTER_ACCESS_SECRET")
        self.enabled = all([self.api_key, self.api_secret, self.access_token, self.access_secret])
        if not self.enabled:
            logger.warning("Twitter API keys not configured. Twitter posting disabled.")

    def post(self, text: str, image_path: Optional[str] = None) -> dict:
        if not self.enabled:
            return {"status": "skipped", "platform": "twitter", "reason": "API keys not configured"}

        try:
            from requests_oauthlib import OAuth1

            auth = OAuth1(self.api_key, self.api_secret, self.access_token, self.access_secret)
            media_id = None

            if image_path and Path(image_path).exists():
                upload_url = "https://upload.twitter.com/1.1/media/upload.json"
                with open(image_path, "rb") as f:
                    resp = requests.post(upload_url, auth=auth, files={"media": f})
                if resp.status_code == 200:
                    media_id = resp.json().get("media_id_string")

            payload = {"text": text[:280]}
            if media_id:
                payload["media"] = {"media_ids": [media_id]}

            resp = requests.post(
                "https://api.twitter.com/2/tweets",
                auth=auth,
                json=payload,
            )
            result = resp.json()
            tweet_id = result.get("data", {}).get("id")
            return {
                "status": "posted" if resp.status_code in (200, 201) else "failed",
                "platform": "twitter",
                "post_id": tweet_id,
                "url": f"https://twitter.com/i/status/{tweet_id}" if tweet_id else None,
                "response": result,
            }
        except ImportError:
            return {"status": "failed", "platform": "twitter", "reason": "requests_oauthlib not installed. Run: pip install requests-oauthlib"}
        except Exception as e:
            return {"status": "failed", "platform": "twitter", "error": str(e)}


class LinkedInClient:
    """LinkedIn API client using OAuth 2.0 access token."""

    def __init__(self):
        self.access_token = os.getenv("LINKEDIN_ACCESS_TOKEN")
        self.person_id = os.getenv("LINKEDIN_PERSON_ID")
        self.enabled = bool(self.access_token)
        if not self.enabled:
            logger.warning("LinkedIn access token not configured. LinkedIn posting disabled.")

    def post(self, text: str, image_path: Optional[str] = None) -> dict:
        if not self.enabled:
            return {"status": "skipped", "platform": "linkedin", "reason": "API keys not configured"}

        try:
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
            }

            if not self.person_id:
                for endpoint in ["https://api.linkedin.com/v2/userinfo", "https://api.linkedin.com/v2/me"]:
                    me_resp = requests.get(endpoint, headers=headers)
                    if me_resp.status_code == 200:
                        data = me_resp.json()
                        self.person_id = data.get("sub") or data.get("id")
                        break
                if not self.person_id:
                    return {"status": "failed", "platform": "linkedin", "reason": "Could not fetch profile ID. Set LINKEDIN_PERSON_ID in .env manually. Find it at: linkedin.com/in/YOUR-PROFILE → view page source → search for 'publicIdentifier'"}

            author_urn = f"urn:li:person:{self.person_id}"
            media_content = None

            if image_path and Path(image_path).exists():
                register_payload = {
                    "registerUploadRequest": {
                        "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
                        "owner": author_urn,
                        "serviceRelationships": [{"relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent"}],
                    }
                }
                reg_resp = requests.post(
                    "https://api.linkedin.com/v2/assets?action=registerUpload",
                    headers=headers,
                    json=register_payload,
                )
                if reg_resp.status_code in (200, 201):
                    upload_data = reg_resp.json()["value"]
                    upload_url = upload_data["uploadMechanism"]["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]["uploadUrl"]
                    asset = upload_data["asset"]
                    with open(image_path, "rb") as f:
                        requests.put(upload_url, headers={"Authorization": f"Bearer {self.access_token}"}, data=f)
                    media_content = {
                        "shareMediaCategory": "IMAGE",
                        "media": [{"status": "READY", "media": asset}],
                    }

            payload = {
                "author": author_urn,
                "lifecycleState": "PUBLISHED",
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {"text": text[:3000]},
                        "shareMediaCategory": "NONE" if not media_content else media_content["shareMediaCategory"],
                    }
                },
                "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
            }
            if media_content:
                payload["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = media_content["media"]

            resp = requests.post("https://api.linkedin.com/v2/ugcPosts", headers=headers, json=payload)

            if resp.status_code == 403 or resp.status_code == 422:
                alt_urn = f"urn:li:member:{self.person_id}"
                payload["author"] = alt_urn
                if media_content:
                    payload["specificContent"]["com.linkedin.ugc.ShareContent"]["media"][0]["media"] = payload["specificContent"]["com.linkedin.ugc.ShareContent"]["media"][0].get("media", "")
                resp = requests.post("https://api.linkedin.com/v2/ugcPosts", headers=headers, json=payload)

            post_id = resp.headers.get("x-restli-id", "")
            return {
                "status": "posted" if resp.status_code in (200, 201) else "failed",
                "platform": "linkedin",
                "post_id": post_id,
                "response": resp.json() if resp.content else {},
            }
        except Exception as e:
            return {"status": "failed", "platform": "linkedin", "error": str(e)}


class InstagramClient:
    """Instagram Graph API client (requires Facebook Page + linked Instagram Business account)."""

    def __init__(self):
        self.access_token = os.getenv("INSTAGRAM_ACCESS_TOKEN")
        self.ig_user_id = os.getenv("INSTAGRAM_BUSINESS_ID")
        self.enabled = all([self.access_token, self.ig_user_id])
        if not self.enabled:
            logger.warning("Instagram API keys not configured. Instagram posting disabled.")

    def post(self, caption: str, image_url: str) -> dict:
        """Post to Instagram. Requires a publicly accessible image URL."""
        if not self.enabled:
            return {"status": "skipped", "platform": "instagram", "reason": "API keys not configured"}

        try:
            container_resp = requests.post(
                f"https://graph.facebook.com/v19.0/{self.ig_user_id}/media",
                data={
                    "image_url": image_url,
                    "caption": caption[:2200],
                    "access_token": self.access_token,
                },
            )
            if container_resp.status_code != 200:
                return {"status": "failed", "platform": "instagram", "response": container_resp.json()}

            creation_id = container_resp.json()["id"]

            for _ in range(10):
                time.sleep(3)
                status_resp = requests.get(
                    f"https://graph.facebook.com/v19.0/{creation_id}",
                    params={"fields": "status_code", "access_token": self.access_token},
                )
                if status_resp.json().get("status_code") == "FINISHED":
                    break

            publish_resp = requests.post(
                f"https://graph.facebook.com/v19.0/{self.ig_user_id}/media_publish",
                data={"creation_id": creation_id, "access_token": self.access_token},
            )
            post_id = publish_resp.json().get("id")
            return {
                "status": "posted" if publish_resp.status_code == 200 else "failed",
                "platform": "instagram",
                "post_id": post_id,
                "response": publish_resp.json(),
            }
        except Exception as e:
            return {"status": "failed", "platform": "instagram", "error": str(e)}


class FacebookClient:
    """Facebook Page API client."""

    def __init__(self):
        self.page_token = os.getenv("FACEBOOK_PAGE_TOKEN")
        self.page_id = os.getenv("FACEBOOK_PAGE_ID")
        self.enabled = all([self.page_token, self.page_id])
        if not self.enabled:
            logger.warning("Facebook API keys not configured. Facebook posting disabled.")

    def post(self, message: str, image_path: Optional[str] = None) -> dict:
        if not self.enabled:
            return {"status": "skipped", "platform": "facebook", "reason": "API keys not configured"}

        try:
            if image_path and Path(image_path).exists():
                with open(image_path, "rb") as f:
                    resp = requests.post(
                        f"https://graph.facebook.com/v19.0/{self.page_id}/photos",
                        data={"message": message, "access_token": self.page_token},
                        files={"source": f},
                    )
            else:
                resp = requests.post(
                    f"https://graph.facebook.com/v19.0/{self.page_id}/feed",
                    data={"message": message, "access_token": self.page_token},
                )

            post_id = resp.json().get("id") or resp.json().get("post_id")
            return {
                "status": "posted" if resp.status_code == 200 else "failed",
                "platform": "facebook",
                "post_id": post_id,
                "response": resp.json(),
            }
        except Exception as e:
            return {"status": "failed", "platform": "facebook", "error": str(e)}


class SocialMediaManager:
    """Unified social media posting across all platforms."""

    def __init__(self):
        self.twitter = TwitterClient()
        self.linkedin = LinkedInClient()
        self.instagram = InstagramClient()
        self.facebook = FacebookClient()
        SCHEDULED_DIR.mkdir(parents=True, exist_ok=True)

    def post_to_twitter(self, text: str, image_path: Optional[str] = None) -> dict:
        return self.twitter.post(text, image_path)

    def post_to_linkedin(self, text: str, image_path: Optional[str] = None) -> dict:
        return self.linkedin.post(text, image_path)

    def post_to_instagram(self, caption: str, image_url: str) -> dict:
        return self.instagram.post(caption, image_url)

    def post_to_facebook(self, message: str, image_path: Optional[str] = None) -> dict:
        return self.facebook.post(message, image_path)

    def post_to_all(
        self,
        text: str,
        image_path: Optional[str] = None,
        image_url: Optional[str] = None,
        platform_copy: Optional[dict] = None,
    ) -> dict:
        """Post to all platforms. Optionally pass platform-specific copy via platform_copy dict."""
        results = {}

        twitter_text = (platform_copy or {}).get("twitter", text)
        results["twitter"] = self.twitter.post(twitter_text[:280], image_path)

        linkedin_text = (platform_copy or {}).get("linkedin", text)
        results["linkedin"] = self.linkedin.post(linkedin_text, image_path)

        ig_caption = (platform_copy or {}).get("instagram", text)
        if image_url:
            results["instagram"] = self.instagram.post(ig_caption, image_url)
        else:
            results["instagram"] = {"status": "skipped", "platform": "instagram", "reason": "Instagram requires a public image URL"}

        fb_text = (platform_copy or {}).get("facebook", text)
        results["facebook"] = self.facebook.post(fb_text, image_path)

        return results

    def save_draft(
        self,
        copy: dict,
        image_prompt: Optional[str] = None,
        image_path: Optional[str] = None,
        scheduled_date: Optional[str] = None,
    ) -> str:
        """Save a post draft to marketing/scheduled-posts/."""
        date_str = scheduled_date or datetime.now().strftime("%Y-%m-%d")
        ts = datetime.now().strftime("%H%M%S")

        draft = {
            "date": date_str,
            "platforms": list(copy.keys()),
            "copy": copy,
            "image_prompt": image_prompt,
            "image_path": image_path,
            "status": "draft",
            "created_at": datetime.now().isoformat(),
            "posted_at": None,
        }

        filename = f"{date_str}_{ts}.json"
        filepath = SCHEDULED_DIR / filename
        filepath.write_text(json.dumps(draft, indent=2))
        logger.info(f"Draft saved: {filepath}")
        return str(filepath)

    def list_drafts(self) -> list:
        """List all draft posts."""
        drafts = []
        for f in sorted(SCHEDULED_DIR.glob("*.json")):
            try:
                data = json.loads(f.read_text())
                data["_file"] = str(f)
                drafts.append(data)
            except Exception:
                pass
        return drafts

    def post_draft(self, draft_path: str) -> dict:
        """Post a saved draft."""
        filepath = Path(draft_path)
        if not filepath.exists():
            return {"error": f"Draft not found: {draft_path}"}

        data = json.loads(filepath.read_text())
        if data.get("status") == "posted":
            return {"error": "Draft already posted"}

        results = self.post_to_all(
            text=data["copy"].get("twitter", ""),
            image_path=data.get("image_path"),
            platform_copy=data.get("copy"),
        )

        data["status"] = "posted"
        data["posted_at"] = datetime.now().isoformat()
        data["results"] = results
        filepath.write_text(json.dumps(data, indent=2))

        return results

    def get_platform_status(self) -> dict:
        """Check which platforms are configured."""
        return {
            "twitter": self.twitter.enabled,
            "linkedin": self.linkedin.enabled,
            "instagram": self.instagram.enabled,
            "facebook": self.facebook.enabled,
        }


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")

    sm = SocialMediaManager()
    print("Platform status:")
    for platform, enabled in sm.get_platform_status().items():
        status = "CONFIGURED" if enabled else "NOT CONFIGURED"
        print(f"  {platform}: {status}")
