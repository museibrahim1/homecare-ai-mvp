#!/usr/bin/env python3
"""
PalmCare AI Marketing Asset Preview
Displays all generated graphics created this morning for Muse's review
"""

import os
from pathlib import Path

def main():
    print("\n" + "="*60)
    print("🌿 PALMCARE AI MARKETING ASSETS — CREATED THIS MORNING")
    print("="*60)
    
    marketing_dir = Path("marketing/generated")
    
    if not marketing_dir.exists():
        print("\n❌ Marketing assets directory not found.")
        print("Expected location: marketing/generated/")
        return
    
    # List all generated assets
    assets = {
        "linkedin_hero.png": "LinkedIn Hero Banner — Company page banner, blog headers",
        "instagram_square_feature.png": "Instagram Square — Feed posts, feature showcase", 
        "instagram_story_stats.png": "Instagram Story — Stats impact, story content",
        "facebook_ad_problem_solution.png": "Facebook Ad — Problem/solution split design",
        "twitter_product_showcase.png": "Twitter Banner — Product showcase, header image",
        "linkedin_post_roi.png": "LinkedIn ROI — Infographic with key metrics",
        "instagram_carousel_1_record.png": "Carousel Slide 1 — Recording step",
        "instagram_carousel_2_analyze.png": "Carousel Slide 2 — AI analysis step", 
        "instagram_carousel_3_contract.png": "Carousel Slide 3 — Contract completion",
        "email_header_outreach.png": "Email Header — Cold outreach banner"
    }
    
    print("\n📊 ASSET INVENTORY (10 Graphics)")
    print("-" * 60)
    
    found_assets = []
    missing_assets = []
    
    for filename, description in assets.items():
        asset_path = marketing_dir / filename
        if asset_path.exists():
            file_size = asset_path.stat().st_size / (1024*1024)  # MB
            found_assets.append(filename)
            print(f"✅ {filename}")
            print(f"   {description}")
            print(f"   Size: {file_size:.1f} MB")
            print()
        else:
            missing_assets.append(filename)
            print(f"❌ {filename} — NOT FOUND")
            print(f"   {description}")
            print()
    
    # Summary
    print("\n" + "="*60)
    print(f"📈 SUMMARY: {len(found_assets)}/10 assets ready")
    
    if found_assets:
        print(f"\n✅ READY TO USE ({len(found_assets)} assets):")
        for asset in found_assets:
            print(f"   • {asset}")
    
    if missing_assets:
        print(f"\n❌ MISSING ({len(missing_assets)} assets):")
        for asset in missing_assets:
            print(f"   • {asset}")
    
    # Usage instructions
    print("\n" + "="*60)
    print("🚀 NEXT STEPS FOR MUSE:")
    print("="*60)
    print("\n1. Review all graphics in: marketing/generated/")
    print("2. Check corresponding copy in: marketing/social-media-copy.md")
    print("3. Deploy using the strategy in: marketing/social-media-graphics.md")
    print("\n📱 Real app screenshots also available in: screenshots/ios/")
    print("📝 Complete brand guidelines in: marketing/asset-overview.md")
    
    print("\n" + "="*60)
    print("🌿 Where care meets intelligence — Ready to launch!")
    print("="*60)
    print("\nAll assets created via Nano Banana 2 AI this morning.")
    print("Perfect for immediate deployment across all marketing channels.")
    print("\nQuestions? Contact the marketing team.")
    print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    main()