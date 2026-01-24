#!/usr/bin/env python3
"""
Import Sample Audio Script

Imports sample audio files for testing the pipeline.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'apps', 'api'))

import argparse
from uuid import UUID
from pathlib import Path

from app.db.session import SessionLocal
from app.models.visit import Visit
from app.models.audio_asset import AudioAsset
from app.services.storage import upload_file_to_s3


def import_audio(visit_id: str, audio_path: str):
    """Import an audio file for a visit."""
    db = SessionLocal()
    
    try:
        # Get visit
        visit = db.query(Visit).filter(Visit.id == UUID(visit_id)).first()
        if not visit:
            print(f"❌ Visit not found: {visit_id}")
            return
        
        # Read audio file
        audio_file = Path(audio_path)
        if not audio_file.exists():
            print(f"❌ Audio file not found: {audio_path}")
            return
        
        with open(audio_file, 'rb') as f:
            content = f.read()
        
        # Determine content type
        suffix = audio_file.suffix.lower()
        content_types = {
            '.wav': 'audio/wav',
            '.mp3': 'audio/mpeg',
            '.m4a': 'audio/x-m4a',
            '.ogg': 'audio/ogg',
        }
        content_type = content_types.get(suffix, 'audio/mpeg')
        
        # Upload to S3
        s3_key = f"visits/{visit_id}/audio/{audio_file.name}"
        print(f"Uploading to S3: {s3_key}")
        upload_file_to_s3(s3_key, content, content_type)
        
        # Create audio asset record
        audio_asset = AudioAsset(
            visit_id=visit.id,
            s3_key=s3_key,
            original_filename=audio_file.name,
            content_type=content_type,
            file_size_bytes=len(content),
            status="uploaded",
        )
        db.add(audio_asset)
        
        # Update visit status
        visit.status = "in_progress"
        
        db.commit()
        
        print(f"✅ Audio imported successfully!")
        print(f"   Visit ID: {visit_id}")
        print(f"   Audio Asset ID: {audio_asset.id}")
        print(f"   S3 Key: {s3_key}")
        
    except Exception as e:
        print(f"❌ Error importing audio: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Import audio file for a visit')
    parser.add_argument('visit_id', help='Visit UUID')
    parser.add_argument('audio_path', help='Path to audio file')
    
    args = parser.parse_args()
    import_audio(args.visit_id, args.audio_path)
