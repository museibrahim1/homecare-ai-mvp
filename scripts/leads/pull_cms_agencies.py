import json
import urllib.request
import sys
from datetime import datetime

API_URL = "https://data.cms.gov/provider-data/api/1/datastore/query/6jpm-sxkc/0"

def pull_state(state, limit=500):
    payload = json.dumps({
        "conditions": [{"property": "state", "value": state, "operator": "="}],
        "limit": limit,
        "keys": True
    }).encode()
    req = urllib.request.Request(API_URL, data=payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    return data.get("results", [])

def parse_cert_date(date_str):
    if not date_str or date_str == "-":
        return None
    try:
        return datetime.strptime(date_str, "%m/%d/%Y")
    except:
        return None

def format_phone(phone):
    if not phone or phone == "-":
        return None
    phone = phone.strip().replace("-", "").replace("(", "").replace(")", "").replace(" ", "")
    if len(phone) == 10:
        return f"({phone[:3]}) {phone[3:6]}-{phone[6:]}"
    return phone

all_agencies = []
for state in ["NE", "IA"]:
    results = pull_state(state)
    print(f"{state}: {len(results)} agencies")
    for r in results:
        cert_date = parse_cert_date(r.get("certification_date", ""))
        years_old = None
        if cert_date:
            years_old = round((datetime.now() - cert_date).days / 365.25, 1)
        
        agency = {
            "state": r.get("state"),
            "provider_name": r.get("provider_name", "").strip().title(),
            "address": r.get("address", "").strip().title(),
            "city": r.get("citytown", "").strip().title(),
            "zip_code": r.get("zip_code", "").strip(),
            "phone": format_phone(r.get("telephone_number")),
            "ownership_type": r.get("type_of_ownership", "").strip().title(),
            "certification_date": r.get("certification_date"),
            "years_old": years_old,
            "ccn": r.get("cms_certification_number_ccn"),
            "star_rating": r.get("quality_of_patient_care_star_rating"),
            "offers_nursing": r.get("offers_nursing_care_services") == "Yes",
            "offers_pt": r.get("offers_physical_therapy_services") == "Yes",
            "offers_ot": r.get("offers_occupational_therapy_services") == "Yes",
            "offers_speech": r.get("offers_speech_pathology_services") == "Yes",
            "offers_social": r.get("offers_medical_social_services") == "Yes",
            "offers_aide": r.get("offers_home_health_aide_services") == "Yes",
        }
        all_agencies.append(agency)

with open("scripts/data/cms_agencies_ne_ia.json", "w") as f:
    json.dump(all_agencies, f, indent=2, default=str)

print(f"\nTotal: {len(all_agencies)} agencies saved to scripts/data/cms_agencies_ne_ia.json")

newer = [a for a in all_agencies if a["years_old"] is not None and a["years_old"] <= 5]
recent = [a for a in all_agencies if a["years_old"] is not None and a["years_old"] <= 10]
print(f"  Certified in last 5 years: {len(newer)}")
print(f"  Certified in last 10 years: {len(recent)}")
print(f"  Proprietary: {len([a for a in all_agencies if 'Proprietary' in a['ownership_type']])}")
print(f"  Non-Profit: {len([a for a in all_agencies if 'Non-Profit' in a['ownership_type']])}")
print(f"  Government: {len([a for a in all_agencies if 'Government' in a['ownership_type']])}")

print("\n--- Newest agencies (last 5 years) ---")
for a in sorted(newer, key=lambda x: x["years_old"]):
    print(f"  {a['provider_name']} | {a['city']}, {a['state']} | {a['phone']} | {a['ownership_type']} | {a['years_old']}yr")
