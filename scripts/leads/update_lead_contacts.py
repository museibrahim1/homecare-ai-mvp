"""
Bulk-update sales_leads table with website/email contact data
discovered from web research.

Usage:
    DATABASE_URL=postgresql://... python3 scripts/update_lead_contacts.py

Reads scripts/data/agency_contacts.json and matches by CCN.
"""

import json
import os
import sys

try:
    import psycopg2
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"])
    import psycopg2


def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL environment variable is required")
        print("Usage: DATABASE_URL=postgresql://user:pass@host:port/db python3 scripts/update_lead_contacts.py")
        sys.exit(1)

    if db_url.startswith("postgresql+psycopg://"):
        db_url = db_url.replace("postgresql+psycopg://", "postgresql://", 1)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    contacts_path = os.path.join(script_dir, "data", "agency_contacts.json")

    with open(contacts_path) as f:
        contacts = json.load(f)

    print(f"Loaded {len(contacts)} contact records")

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    updated = 0
    skipped = 0
    not_found = 0

    for c in contacts:
        ccn = c.get("ccn")
        if not ccn:
            skipped += 1
            continue

        website = c.get("website")
        email = c.get("contact_email")
        notes = c.get("contact_notes")

        if not website and not email and not notes:
            skipped += 1
            continue

        cur.execute("SELECT id FROM sales_leads WHERE ccn = %s", (ccn,))
        row = cur.fetchone()
        if not row:
            not_found += 1
            continue

        set_parts = []
        params = []

        if website:
            set_parts.append("website = %s")
            params.append(website)
        if email:
            set_parts.append("contact_email = %s")
            params.append(email)
        if notes:
            set_parts.append("notes = %s")
            params.append(notes)

        set_parts.append("updated_at = now()")
        sql = f"UPDATE sales_leads SET {', '.join(set_parts)} WHERE ccn = %s"
        params.append(ccn)

        cur.execute(sql, params)
        updated += 1

    conn.commit()

    cur.execute("SELECT COUNT(*) FROM sales_leads WHERE contact_email IS NOT NULL AND contact_email != ''")
    with_email = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM sales_leads WHERE website IS NOT NULL AND website != ''")
    with_website = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM sales_leads")
    total = cur.fetchone()[0]

    cur.close()
    conn.close()

    print(f"\nResults:")
    print(f"  Updated:   {updated}")
    print(f"  Skipped:   {skipped}")
    print(f"  Not found: {not_found}")
    print(f"  Total:     {len(contacts)}")
    print(f"\nDatabase totals:")
    print(f"  Total leads:    {total}")
    print(f"  With email:     {with_email}")
    print(f"  With website:   {with_website}")
    print(f"  Without email:  {total - with_email}")


if __name__ == "__main__":
    main()
