"""
Clean up sales_leads database:
1. Remove government agencies, hospital-based home health, county PHNS, and
   university medical centers (not SaaS prospects)
2. Fix city name typo: "Co Bluffs" -> "Council Bluffs"
"""

import os
import sys

try:
    import psycopg2
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"])
    import psycopg2


GOVERNMENT_HOSPITAL_DELETIONS = [
    # IA - Government Operated / County PHNS
    ("Community Health Services", "Algona"),
    ("Butler County Phns", "Allison"),
    ("Taylor County Public Health Agency", "Bedford"),
    ("Des Moines County Health Department", "Burlington"),
    ("Floyd County Public Health/ Home Health Care", "Charles City"),
    ("Wayne County Public Health Nursing Service", "Corydon"),
    ("Community Health Services", "Cresco"),
    ("Crawford County Home Health, Hospice & Public Heal", "Denison"),
    ("Palo Alto Community Health", "Emmetsburg"),
    ("Winnebago County Phns", "Forest City"),
    ("Webster County Health Department", "Fort Dodge"),
    ("Lee County Health Department", "Fort Madison"),
    ("Guthrie County Phns", "Guthrie Center"),
    ("Franklin County Public Health", "Hampton"),
    ("Van Buren County Phns", "Keosauqua"),
    ("Harrison County Public Health", "Logan"),
    ("Iowa County Health Department", "Marengo"),
    ("Cerro Gordo County Department Of Public Health", "Mason City"),
    ("Chickasaw Co Public Health & Home Care Services", "New Hampton"),
    ("Worth County Phns", "Northwood"),
    ("Orange City Home Health", "Orange City"),
    ("Pocahontas County Public Health", "Pocahontas"),
    ("Sac County Phns", "Sac City"),
    ("Keokuk County Phns", "Sigourney"),
    ("Sioux Center Home Health And Hospice", "Sioux Center"),
    ("Lakes Regional Healthcare Home Care", "Spirit Lake"),
    ("Buena Vista County Public Health And Home Care", "Storm Lake"),
    ("Cedar County Public Health Nursing Services", "Tipton"),
    ("Tama County Public Health & Ho", "Toledo"),
    ("Louisa County Phns", "Wapello"),
    ("Washington Co. Public Health", "Washington"),
    ("Hamilton County Public Health Nursing Services", "Webster City"),

    # IA - Hospital-based home health
    ("Mary Greeley Home Health Services", "Ames"),
    ("St Anthony Regional Hospital And Nursing Home", "Carroll"),
    ("Hancock County Health System Community Health", "Garner"),
    ("Myrtue Med Center Home Health", "Harlan"),
    ("Horn Memorial Hospital H H A", "Ida Grove"),
    ("University Of Iowa Health Care Medical Center Downtown Home Health", "Iowa City"),
    ("Floyd Valley Hospital Community Health Services", "Le Mars"),
    ("Regional Medical Center Home Care", "Manchester"),
    ("Mitchell County Home Health Care/ Public Health", "Osage"),
    ("Pella Regional Home Health Agency", "Pella"),
    ("Virginia Gay Hospital Home Health Agency", "Vinton"),
    ("V M H Comunity & Home Care", "Waukon"),
    ("Gundersen Palmer Lutheran Hosp & Clin-Home Health", "West Union"),

    # NE - Government Operated
    ("Boone County Health Center Home Health", "Albion"),
    ("Morrill County Comm. Hosp. Home Health Agency", "Bridgeport"),
    ("Central Plains Home Health", "Cozad"),
    ("Methodist Fremont Health Home Care", "Fremont"),
    ("Avera At Home Dba Avera@Home", "O' Neill"),
    ("Vchs Home Health", "Ord"),
    ("Johnson Co. Hosp. Home Health Services", "Tecumseh"),
    ("Cherry Co Hospital Home Health Services", "Valentine"),

    # NE - Hospital-based home health
    ("Chadron Community Hospital And Health Services", "Chadron"),
    ("Home Health Of Columbus Community Hospital", "Columbus"),
    ("Antelope Memorial Hospital Home Health Care", "Neligh"),
    ("Providence Medical Center Home Health", "Wayne"),
    ("York General Hosp Home Health", "York"),
]


def main():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL required")
        sys.exit(1)

    if db_url.startswith("postgresql+psycopg://"):
        db_url = db_url.replace("postgresql+psycopg://", "postgresql://", 1)

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM sales_leads")
    before = cur.fetchone()[0]
    print(f"Leads before cleanup: {before}")

    # 1. Delete government/hospital agencies
    deleted = 0
    not_found = 0
    for name, city in GOVERNMENT_HOSPITAL_DELETIONS:
        cur.execute(
            "DELETE FROM sales_leads WHERE provider_name = %s AND city = %s RETURNING id",
            (name, city)
        )
        rows = cur.fetchall()
        if rows:
            deleted += len(rows)
        else:
            not_found += 1
            print(f"  NOT FOUND: {name} | {city}")

    print(f"\nDeleted government/hospital agencies: {deleted}")
    if not_found:
        print(f"Not found (may have different spelling): {not_found}")

    # 2. Fix "Co Bluffs" -> "Council Bluffs"
    cur.execute(
        "UPDATE sales_leads SET city = 'Council Bluffs' WHERE city = 'Co Bluffs' RETURNING id"
    )
    fixed_city = len(cur.fetchall())
    if fixed_city:
        print(f"Fixed city name 'Co Bluffs' -> 'Council Bluffs': {fixed_city}")

    # 3. Final dedup check (exact name + city match)
    cur.execute("""
        SELECT provider_name, city, state, COUNT(*) as cnt
        FROM sales_leads
        GROUP BY provider_name, city, state
        HAVING COUNT(*) > 1
    """)
    dupes = cur.fetchall()
    if dupes:
        print(f"\nExact duplicates remaining:")
        for d in dupes:
            print(f"  {d[0]} | {d[1]}, {d[2]} (x{d[3]})")
            cur.execute("""
                DELETE FROM sales_leads
                WHERE id IN (
                    SELECT id FROM sales_leads
                    WHERE provider_name = %s AND city = %s AND state = %s
                    ORDER BY
                        CASE WHEN contact_email IS NOT NULL AND contact_email != '' THEN 0 ELSE 1 END,
                        CASE WHEN website IS NOT NULL AND website != '' THEN 0 ELSE 1 END,
                        created_at ASC
                    OFFSET 1
                )
            """, (d[0], d[1], d[2]))
            extra_deleted = cur.rowcount
            if extra_deleted:
                deleted += extra_deleted
                print(f"    -> Removed {extra_deleted} duplicate(s), kept best record")
    else:
        print("\nNo exact duplicates found.")

    # 4. Fuzzy dedup check (normalized name match in same city)
    cur.execute("""
        SELECT a.id, a.provider_name, a.city, b.id, b.provider_name, b.city
        FROM sales_leads a
        JOIN sales_leads b ON a.id < b.id
        WHERE a.city = b.city AND a.state = b.state
        AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(
            a.provider_name, ',', ''), '.', ''), ' Llc', ''), ' Inc', ''))
          = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(
            b.provider_name, ',', ''), '.', ''), ' Llc', ''), ' Inc', ''))
    """)
    fuzzy = cur.fetchall()
    if fuzzy:
        print(f"\nFuzzy duplicates found:")
        for f in fuzzy:
            print(f"  '{f[1]}' ({f[2]}) vs '{f[4]}' ({f[5]})")
    else:
        print("No fuzzy duplicates found.")

    conn.commit()

    # Final stats
    cur.execute("SELECT COUNT(*) FROM sales_leads")
    after = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM sales_leads WHERE contact_email IS NOT NULL AND contact_email != ''")
    with_email = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM sales_leads WHERE website IS NOT NULL AND website != ''")
    with_website = cur.fetchone()[0]
    cur.execute("SELECT state, COUNT(*) FROM sales_leads GROUP BY state ORDER BY state")
    by_state = cur.fetchall()
    cur.execute("""
        SELECT ownership_type, COUNT(*)
        FROM sales_leads GROUP BY ownership_type ORDER BY COUNT(*) DESC
    """)
    by_type = cur.fetchall()

    print(f"\n{'='*50}")
    print(f"CLEANUP COMPLETE")
    print(f"{'='*50}")
    print(f"Before:      {before}")
    print(f"Deleted:     {deleted}")
    print(f"After:       {after}")
    print(f"With email:  {with_email}")
    print(f"With website:{with_website}")
    print(f"\nBy state:")
    for s in by_state:
        print(f"  {s[0]}: {s[1]}")
    print(f"\nBy ownership type:")
    for t in by_type:
        print(f"  {t[0] or 'NULL'}: {t[1]}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
