"""
Import newly discovered home care agencies into sales_leads.
Deduplicates against existing DB entries by normalized name + city.
"""

import json
import os
import sys
import re
from datetime import datetime

try:
    import psycopg2
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"])
    import psycopg2


def normalize(name):
    """Normalize agency name for dedup comparison."""
    n = name.lower().strip()
    n = re.sub(r'\b(llc|inc|corp|ltd|l\.?l\.?c\.?)\b', '', n)
    n = re.sub(r'[^a-z0-9 ]', '', n)
    n = re.sub(r'\s+', ' ', n).strip()
    return n


NEW_AGENCIES = [
    # === BATCH 1: OMAHA & SURROUNDING (from agent 1) ===
    # National/franchise
    {"provider_name": "Home Instead Senior Care", "address": "13323 California St", "city": "Omaha", "state": "NE", "zip_code": "68154", "phone": "(402) 498-3444", "website": "https://homeinstead.com/location/100", "contact_email": "info@homeinstead.com", "services": "Personal care, Alzheimer's care, companionship", "notes": "Global HQ in Omaha"},
    {"provider_name": "Home Instead Senior Care", "address": "114 E 1st St, Suite 109", "city": "Papillion", "state": "NE", "zip_code": "68046", "phone": "(402) 292-6611", "website": "https://homeinstead.com", "contact_email": None, "services": "Respite care, dementia care, companionship", "notes": "Serves Sarpy, Cass, Pottawattamie counties"},
    {"provider_name": "Visiting Angels Omaha", "address": "701 Galvin Rd S, Suite 102", "city": "Bellevue", "state": "NE", "zip_code": "68005", "phone": "(402) 917-8225", "website": "https://visitingangels.com/omaha", "contact_email": None, "services": "Personal care, companion care, Alzheimer's/dementia care", "notes": "Serves Omaha, Bellevue, Papillion, La Vista"},
    {"provider_name": "Comfort Keepers Omaha", "address": "4060 Vinton St, Suite 100", "city": "Omaha", "state": "NE", "zip_code": "68105", "phone": "(402) 991-9880", "website": "https://comfortkeepers.com/offices/nebraska/omaha", "contact_email": None, "services": "Personal care, companionship, Alzheimer's/dementia care", "notes": "Serves Omaha metro and Council Bluffs"},
    {"provider_name": "Right at Home Omaha Metro", "address": "13304 W Center Rd, Suite 225", "city": "Omaha", "state": "NE", "zip_code": "68144", "phone": "(402) 697-7536", "website": "https://rightathome.net/omaha-metro", "contact_email": None, "services": "Companion care, personal care, skilled nursing", "notes": "Founded in Omaha 1995; accepts VA"},
    {"provider_name": "Interim HealthCare of Omaha", "address": "5332 S 138th St, Suite 100", "city": "Omaha", "state": "NE", "zip_code": "68137", "phone": "(402) 392-1818", "website": "https://interimhealthcare.com", "contact_email": None, "services": "Skilled nursing, wound care, IV therapy, PT/OT/ST", "notes": "Separate from Lincoln location"},
    {"provider_name": "FirstLight Home Care of Omaha", "address": "2717 S 88th St", "city": "Omaha", "state": "NE", "zip_code": "68124", "phone": "(402) 614-0413", "website": "https://firstlighthomecare.com/home-healthcare-omaha", "contact_email": None, "services": "Personal care, companion care, respite, dementia care", "notes": "Serves Omaha, Elkhorn, Papillion"},
    {"provider_name": "SYNERGY HomeCare Omaha", "address": "5017 Leavenworth St, Suite 2", "city": "Omaha", "state": "NE", "zip_code": "68106", "phone": "(402) 505-7300", "website": "https://synergyhomecare.com/ne-omaha-68106", "contact_email": None, "services": "Companion care, personal care, Alzheimer's/dementia, transportation", "notes": "4.3-star rating; 24-hour care"},
    {"provider_name": "A Place at Home Omaha", "address": "9829 S 168th Ave", "city": "Omaha", "state": "NE", "zip_code": "68136", "phone": "(402) 932-4646", "website": "https://aplaceathome.com/omaha", "contact_email": None, "services": "Companion care, personal care, care coordination", "notes": "Serves Omaha, Papillion, Gretna, Elkhorn"},
    {"provider_name": "Seniors Helping Seniors Greater Omaha", "address": "1401 E Gold Coast Rd, Suite 430", "city": "Papillion", "state": "NE", "zip_code": "68046", "phone": "(402) 331-3073", "website": "https://seniorcaregreateromaha.com", "contact_email": None, "services": "Companionship, daily living, dementia care, meal prep", "notes": "Senior caregivers serving seniors model"},
    {"provider_name": "Village Caregiving of Omaha", "address": "1299 Farnam St, Suite 300", "city": "Omaha", "state": "NE", "zip_code": "68102", "phone": "(402) 672-9885", "website": "https://villagecaregiving.com/village-caregiving-of-omaha", "contact_email": None, "services": "Bathing, meal prep, grooming, housekeeping, transportation", "notes": "11+ years; Optum/TriWest network"},
    {"provider_name": "Cornerstone Caregiving Omaha", "address": "1826 N 203rd St", "city": "Elkhorn", "state": "NE", "zip_code": "68022", "phone": None, "website": "https://cornerstonecaregiving.com/locations/omaha-ne", "contact_email": None, "services": "Veteran care, Alzheimer's/dementia, hospice, 24-hour care, respite", "notes": "150+ locations in 30+ states"},
    # Local/independent Omaha
    {"provider_name": "Kellah Home Care LLC", "address": "14301 FNB Parkway, Suite 100", "city": "Omaha", "state": "NE", "zip_code": "68154", "phone": "(402) 706-6894", "website": "https://kellahhomecare.com", "contact_email": "info@kellahhomecare.com", "services": "Personal care, companion care, medication reminders, Nurse Navigation", "notes": "Nurse-owned; founded 2019; serves metro incl CB"},
    {"provider_name": "BellaCare Inc", "address": "7230 Maple St", "city": "Omaha", "state": "NE", "zip_code": "68134", "phone": "(402) 347-0007", "website": "https://bellacare.us", "contact_email": None, "services": "Personal care, dementia care, hospice, post-surgery, transportation", "notes": "Army veteran-founded 2016; 55 caregivers; 24/7"},
    {"provider_name": "Rosalie LLC", "address": "11605 W Dodge Rd, Suite 4", "city": "Omaha", "state": "NE", "zip_code": "68154", "phone": "(402) 979-7770", "website": "https://rosalie-llc.com", "contact_email": "quality@rosaliellc.com", "services": "Companion care, home health, staffing services", "notes": "Serves Eastern NE and Western IA; 24/7"},
    {"provider_name": "A Kind Heart Caregivers", "address": "8790 F St", "city": "Omaha", "state": "NE", "zip_code": "68127", "phone": "(531) 213-7662", "website": "https://akindheart.info", "contact_email": None, "services": "Housekeeping, personal care, meal prep, transportation, Alzheimer's, autism", "notes": "Also serves Kansas City"},
    {"provider_name": "Concierge Home Care LLC", "address": "3325 N 148th Ct, Suite 3206", "city": "Omaha", "state": "NE", "zip_code": "68116", "phone": "(402) 650-3818", "website": "https://conciergehomecareomaha.com", "contact_email": None, "services": "Light housekeeping, laundry, personal care, Hoyer lift, transportation", "notes": "Non-medical; certified caregivers"},
    {"provider_name": "1st Choice Home Care", "address": "16502 Burdette St", "city": "Omaha", "state": "NE", "zip_code": "68116", "phone": "(402) 208-7047", "website": "https://1stchoicehomecareomaha.com", "contact_email": None, "services": "Personal care, companion care, Alzheimer's/dementia, 24-hour live-in", "notes": "Est. 2022; accepts Medicaid waiver, Medicare"},
    {"provider_name": "Obensen Home Health Care LLC", "address": "3310 N 93rd Ave", "city": "Omaha", "state": "NE", "zip_code": "68134", "phone": "(402) 208-9401", "website": "https://obensenhhc.com", "contact_email": None, "services": "Toileting, dressing, mobility, meal prep, medication reminders, dementia", "notes": "Non-medical; founded 2017"},
    {"provider_name": "Always Best Care Omaha", "address": "7431 N 140th St", "city": "Omaha", "state": "NE", "zip_code": "68142", "phone": "(402) 208-9371", "website": "https://alwaysbestcareservices.com", "contact_email": "alwaysbcare@gmail.com", "services": "Personal care, companion care, respite, dementia, 24-hour care", "notes": None},
    {"provider_name": "Caretech Inc", "address": "1011 Q St, Suite 101C", "city": "Omaha", "state": "NE", "zip_code": "68137", "phone": "(402) 697-5121", "website": "https://caretechinc.com", "contact_email": "info@caretechinc.com", "services": "24-hour care, personal care, dementia, veteran care, disability care", "notes": "Family-owned; 25+ years; accepts VA"},
    {"provider_name": "AmanaCare Home Care", "address": "4611 S 96th St, Suite 159", "city": "Omaha", "state": "NE", "zip_code": "68127", "phone": "(402) 440-5878", "website": "https://amana-care.com", "contact_email": "contact@amana-care.com", "services": "Personal care, companion care, dementia, Parkinson's, veteran care", "notes": "Faith-based; Medicaid waiver provider"},
    {"provider_name": "Always At Home Supportive Living LLC", "address": "1905 Harney St, Suite 703", "city": "Omaha", "state": "NE", "zip_code": "68102", "phone": "(402) 346-6164", "website": "https://alwaysathomeliving.com", "contact_email": "AlwaysAtHomeLivingLLC@gmail.com", "services": "Cleaning, meal prep, bathing, grooming, medication reminders, transportation", "notes": "Accepts Medicaid, insurance, private pay"},
    {"provider_name": "Blue Oasis Home Care", "address": "1913 Military Ave", "city": "Omaha", "state": "NE", "zip_code": "68111", "phone": "(531) 375-1663", "website": "https://blueoasishomecare.com", "contact_email": "blueoasis.wecare@gmail.com", "services": "Companionship, personal care, housekeeping, meal prep, medication reminders", "notes": "Accepts Medicare, Medicaid, VA, private pay"},
    {"provider_name": "Venus Home Care LLC", "address": "7702 Howell St", "city": "Omaha", "state": "NE", "zip_code": "68122", "phone": "(402) 812-8577", "website": "https://venushcare.com", "contact_email": "Venushc20@gmail.com", "services": "Personal care, daily activity assistance, companionship, specialized care", "notes": None},
    {"provider_name": "All Midlands Health Services", "address": "6910 Pacific St, Suite 200", "city": "Omaha", "state": "NE", "zip_code": "68106", "phone": "(402) 391-5554", "website": "https://AllMidlands.com", "contact_email": "Tammy@AllMidlands.com", "services": "Meal prep, housekeeping, companion services", "notes": "Non-medical companion services"},
    {"provider_name": "Express Home Care", "address": None, "city": "Omaha", "state": "NE", "zip_code": None, "phone": "(531) 541-2354", "website": "https://expresshomecareomaha.com", "contact_email": "admin@expresshomecareomaha.com", "services": "Meal prep, bathing, housekeeping, companionship, transportation", "notes": "24-hour certified caregivers"},
    {"provider_name": "Sister's With A Purpose Inc", "address": "505 Cornhusker Rd, Suite 106", "city": "Bellevue", "state": "NE", "zip_code": "68005", "phone": "(888) 743-1329", "website": "https://sisterswithapurposeinc.org", "contact_email": "cnasisterswithapurposeinc@yahoo.com", "services": "Companionship, daily living, 24/7 care", "notes": "Personal care in homes or care facilities"},
    {"provider_name": "Arial Home Health", "address": "9290 W Dodge Rd, Suite 201A", "city": "Omaha", "state": "NE", "zip_code": "68114", "phone": "(402) 393-0833", "website": "https://arialhomecare.com", "contact_email": None, "services": "Skilled nursing, PT/OT/ST, wound care, IV therapy", "notes": "Serves Douglas, Sarpy, Dodge, Pottawattamie counties"},
    {"provider_name": "Amazing Angels Home Health & Hospice LLC", "address": "2216 N 91st Plaza", "city": "Omaha", "state": "NE", "zip_code": "68134", "phone": "(402) 455-2500", "website": None, "contact_email": None, "services": "Nursing, PT, OT, speech, medical social services, hospice", "notes": "CMS-certified since 2008"},
    # HomeCare Advocacy Network (CB)
    {"provider_name": "HomeCare Advocacy Network SW Iowa", "address": "300 West Broadway, Suite 222", "city": "Council Bluffs", "state": "IA", "zip_code": "51503", "phone": "(712) 318-1992", "website": "https://hcan.com/southwestiowa", "contact_email": "n.black@hcanthrive.com", "services": "Companion care, transportation, personal care, hospice support, Alzheimer's care", "notes": "24/7 on-call; contact Niki Black"},

    # === BATCH 2: IOWA MAJOR CITIES (from agent 2) - only unique agencies ===
    {"provider_name": "Home Instead Des Moines", "address": None, "city": "Des Moines", "state": "IA", "zip_code": None, "phone": "(515) 276-4188", "website": "https://homeinstead.com/218", "contact_email": None, "services": "Personal care, Alzheimer's/dementia, companionship, meal prep", "notes": "National franchise; metro Des Moines"},
    {"provider_name": "Comfort Keepers Des Moines", "address": None, "city": "Urbandale", "state": "IA", "zip_code": None, "phone": "(515) 243-0011", "website": "https://comfortkeepers.com/offices/iowa/des-moines", "contact_email": None, "services": "Companion care, personal care, in-home care", "notes": "Serves greater Des Moines metro"},
    {"provider_name": "Right at Home Des Moines", "address": None, "city": "West Des Moines", "state": "IA", "zip_code": None, "phone": "(515) 225-8808", "website": "https://rightathome.net/des-moines", "contact_email": None, "services": "Companion care, personal care, skilled nursing", "notes": "Serves Des Moines metro"},
    {"provider_name": "Visiting Angels Cedar Rapids", "address": None, "city": "Cedar Rapids", "state": "IA", "zip_code": None, "phone": "(319) 364-4100", "website": "https://visitingangels.com/cedarrapids", "contact_email": None, "services": "Personal care, companion care, Alzheimer's/dementia", "notes": "Eastern Iowa coverage"},
    {"provider_name": "Home Instead Cedar Rapids", "address": None, "city": "Cedar Rapids", "state": "IA", "zip_code": None, "phone": "(319) 396-4663", "website": "https://homeinstead.com/295", "contact_email": None, "services": "Personal care, memory care, 24-hour, companionship", "notes": "Serves Cedar Rapids metro"},
    {"provider_name": "Griswold Home Care Iowa City", "address": None, "city": "Iowa City", "state": "IA", "zip_code": None, "phone": "(319) 333-4000", "website": "https://griswoldhomecare.com/iowa-city", "contact_email": None, "services": "Companion care, personal care, homemaker services", "notes": "Serves Iowa City/Coralville area"},
    {"provider_name": "Right at Home Coralville", "address": None, "city": "Coralville", "state": "IA", "zip_code": None, "phone": "(319) 337-3262", "website": "https://rightathome.net/coralville", "contact_email": None, "services": "Companion care, personal care, skilled nursing", "notes": "Serves Iowa City/Johnson County"},
    {"provider_name": "Comfort Keepers Davenport", "address": None, "city": "Davenport", "state": "IA", "zip_code": None, "phone": "(563) 324-1212", "website": "https://comfortkeepers.com/offices/iowa/davenport", "contact_email": None, "services": "Companion care, personal care, interactive caregiving", "notes": "Serves Quad Cities"},
    {"provider_name": "Home Instead Quad Cities", "address": None, "city": "Davenport", "state": "IA", "zip_code": None, "phone": "(563) 359-4663", "website": "https://homeinstead.com", "contact_email": None, "services": "Personal care, Alzheimer's/dementia, companionship", "notes": "Quad Cities coverage"},
    {"provider_name": "Seniors Helping Seniors Des Moines", "address": None, "city": "Des Moines", "state": "IA", "zip_code": None, "phone": "(515) 250-4966", "website": "https://seniorshelpingseniors.com/des-moines", "contact_email": None, "services": "Companionship, daily living, light housekeeping", "notes": "Senior-to-senior care model"},
    {"provider_name": "Always Best Care Cedar Rapids", "address": None, "city": "Cedar Rapids", "state": "IA", "zip_code": None, "phone": "(319) 366-1190", "website": "https://alwaysbestcare.com/cedar-rapids", "contact_email": None, "services": "In-home senior care, companion care, personal care", "notes": "Serves Linn County"},

    # === BATCH 3: IOWA SMALLER CITIES (from agent 3) ===
    {"provider_name": "Visiting Angels Siouxland", "address": "3133 Floyd Blvd #B", "city": "Sioux City", "state": "IA", "zip_code": "51108", "phone": "(712) 212-9246", "website": "https://visitingangels.com/siouxland", "contact_email": None, "services": "Companionship, daily living, medication reminders, dementia care", "notes": "Locally owned; serves NE Nebraska & SE South Dakota"},
    {"provider_name": "Home Instead Sioux City", "address": "220 S Fairmount St", "city": "Sioux City", "state": "IA", "zip_code": "51106", "phone": "(712) 258-4267", "website": "https://homeinstead.com/381", "contact_email": None, "services": "Personal care, Alzheimer's/dementia, wound care, hospice", "notes": "National franchise; locally owned"},
    {"provider_name": "CARE4U Home Care LLC", "address": "505 5th St, Ste 403", "city": "Sioux City", "state": "IA", "zip_code": "51101", "phone": "(712) 577-6470", "website": "https://care4uhomecarellc.godaddysites.com", "contact_email": None, "services": "Non-medical home care, meal prep, bathing, dressing, transportation", "notes": "Small local agency; $34-$44/hr"},
    {"provider_name": "Home Instead Waterloo", "address": "1844 W Ridgeway Ave", "city": "Waterloo", "state": "IA", "zip_code": "50701", "phone": "(319) 235-5999", "website": "https://homeinstead.com/662", "contact_email": None, "services": "24-hour care, mobility, memory care, companionship, personal care", "notes": "Serves Waterloo & Cedar Falls area"},
    {"provider_name": "Senior Helpers Northeast Iowa", "address": "2307 Falls Ave", "city": "Waterloo", "state": "IA", "zip_code": "50701", "phone": "(800) 805-3621", "website": "https://seniorhelpers.com", "contact_email": None, "services": "Housekeeping, meal prep, personal care, Alzheimer's/dementia, transportation", "notes": "4.0 star rating"},
    {"provider_name": "Always Best Care Cedar Valley", "address": "3336 Kimball Ave", "city": "Waterloo", "state": "IA", "zip_code": "50702", "phone": "(319) 826-4536", "website": "https://alwaysbestcare.com/cedar-valley", "contact_email": None, "services": "In-home senior care, companion care, personal care", "notes": "Serves Cedar Valley communities"},
    {"provider_name": "Comfort Keepers Council Bluffs", "address": "645 9th Avenue", "city": "Council Bluffs", "state": "IA", "zip_code": "51501", "phone": "(712) 526-3900", "website": "https://comfortkeepers.com/offices/iowa/council-bluffs", "contact_email": None, "services": "Companion care, personal care, interactive caregiving", "notes": "Serving since 2002; independently owned"},
    {"provider_name": "Dubuque Home Care", "address": "1106 Grove Terrace", "city": "Dubuque", "state": "IA", "zip_code": "52001", "phone": "(563) 275-7662", "website": "https://dubuquehomecare.org", "contact_email": None, "services": "Non-medical home care, personal care, transportation, meal prep", "notes": "Locally owned since 2006; serves seniors, disabled, veterans"},
    {"provider_name": "Home Instead Dubuque", "address": "2477 John F Kennedy Rd", "city": "Dubuque", "state": "IA", "zip_code": "52002", "phone": "(563) 585-1409", "website": "https://homeinstead.com/354", "contact_email": None, "services": "Personal care, Alzheimer's/dementia, hospice support, 24-hour care", "notes": "Open 24/7; 20+ years"},
    {"provider_name": "MercyOne North Iowa Home Care", "address": "910 N Eisenhower Ave", "city": "Mason City", "state": "IA", "zip_code": "50401", "phone": "(641) 428-6444", "website": "https://mercyone.org", "contact_email": None, "services": "Skilled nursing, therapy, personal care, infusion therapy, medical equipment", "notes": "Medicare-certified"},
    {"provider_name": "Friendship Haven Home Health Care", "address": "420 Kenyon Road", "city": "Fort Dodge", "state": "IA", "zip_code": "50501", "phone": "(515) 573-2121", "website": "https://friendshiphaven.org", "contact_email": None, "services": "Home health, independent/assisted living, skilled nursing, memory care", "notes": "Nonprofit continuing care community"},
    {"provider_name": "Comfort Keepers Marshalltown", "address": "2901 S Center St, Ste 2", "city": "Marshalltown", "state": "IA", "zip_code": "50158", "phone": "(515) 243-0011", "website": "https://comfortkeepers.com/offices/iowa/marshalltown", "contact_email": None, "services": "Companion care, personal care, homemaking, 24-hour care, respite", "notes": "National franchise, local office"},
    {"provider_name": "Ottumwa Regional Home Care", "address": "1011 Pennsylvania Ave, Suite D", "city": "Ottumwa", "state": "IA", "zip_code": "52501", "phone": "(641) 684-3136", "website": None, "contact_email": None, "services": "Skilled nursing, therapy, personal care, medication mgmt, hospice, memory care", "notes": "Medicare-certified; 5-star CMS rating"},

    # === BATCH 4: LINCOLN + NICHE/NON-MEDICAL (from agent 4) ===
    {"provider_name": "Home Instead Lincoln", "address": None, "city": "Lincoln", "state": "NE", "zip_code": None, "phone": "(402) 423-8119", "website": "https://homeinstead.com/102", "contact_email": None, "services": "Personal care, Alzheimer's/dementia, companionship, meal prep", "notes": "National franchise; Lincoln metro"},
    {"provider_name": "Visiting Angels Lincoln", "address": None, "city": "Lincoln", "state": "NE", "zip_code": None, "phone": "(402) 235-4321", "website": "https://visitingangels.com/lincoln", "contact_email": None, "services": "Personal care, companion care, Alzheimer's/dementia", "notes": "Serves Lincoln and surrounding areas"},
    {"provider_name": "Right at Home Lincoln", "address": None, "city": "Lincoln", "state": "NE", "zip_code": None, "phone": "(402) 261-0999", "website": "https://rightathome.net/lincoln", "contact_email": None, "services": "Companion care, personal care, skilled nursing", "notes": "Serves Lincoln metro"},
    {"provider_name": "SYNERGY HomeCare Lincoln", "address": None, "city": "Lincoln", "state": "NE", "zip_code": None, "phone": "(402) 261-2067", "website": "https://synergyhomecare.com/lincoln", "contact_email": None, "services": "Companion care, personal care, Alzheimer's/dementia, transportation", "notes": "National franchise"},
    {"provider_name": "Senior Helpers Lincoln", "address": None, "city": "Lincoln", "state": "NE", "zip_code": None, "phone": "(402) 261-5300", "website": "https://seniorhelpers.com/ne/lincoln", "contact_email": None, "services": "Personal care, Alzheimer's/dementia, Parkinson's care", "notes": "National franchise; Lincoln metro"},
    {"provider_name": "Cornerstone Caregiving Lincoln", "address": None, "city": "Lincoln", "state": "NE", "zip_code": None, "phone": None, "website": "https://cornerstonecaregiving.com/locations/lincoln-ne", "contact_email": None, "services": "Veteran care, Alzheimer's/dementia, hospice, 24-hour care", "notes": "150+ locations"},
    {"provider_name": "Home Care Partners of Nebraska", "address": None, "city": "Lincoln", "state": "NE", "zip_code": None, "phone": "(402) 780-1211", "website": "https://homecarepartnersne.com", "contact_email": None, "services": "Personal care, companion care, respite, homemaker services", "notes": "Locally owned; top-3 rated in Lincoln"},
    {"provider_name": "Sunlight Senior Care", "address": None, "city": "Lincoln", "state": "NE", "zip_code": None, "phone": "(402) 476-6060", "website": "https://sunlightseniorcare.com", "contact_email": None, "services": "Non-medical companion care, personal care, homemaker services", "notes": "Also serves Omaha and Des Moines"},
    {"provider_name": "Home Instead Fremont", "address": None, "city": "Fremont", "state": "NE", "zip_code": None, "phone": "(402) 721-0855", "website": "https://homeinstead.com", "contact_email": None, "services": "Personal care, Alzheimer's/dementia, companionship", "notes": "Serves Fremont and Dodge County"},
    {"provider_name": "Visiting Angels Fremont", "address": None, "city": "Fremont", "state": "NE", "zip_code": None, "phone": "(402) 721-7300", "website": "https://visitingangels.com/fremont", "contact_email": None, "services": "Personal care, companion care", "notes": "Serves Fremont area"},
    {"provider_name": "Home Instead Grand Island", "address": None, "city": "Grand Island", "state": "NE", "zip_code": None, "phone": "(308) 384-2979", "website": "https://homeinstead.com", "contact_email": None, "services": "Personal care, Alzheimer's/dementia, companionship", "notes": "Serves Grand Island, Hastings, Kearney"},
    {"provider_name": "Home Instead Scottsbluff", "address": None, "city": "Scottsbluff", "state": "NE", "zip_code": None, "phone": "(308) 635-4663", "website": "https://homeinstead.com", "contact_email": None, "services": "Personal care, Alzheimer's/dementia, companionship", "notes": "Western Nebraska coverage"},
    {"provider_name": "Home Instead North Platte", "address": None, "city": "North Platte", "state": "NE", "zip_code": None, "phone": "(308) 534-4663", "website": "https://homeinstead.com", "contact_email": None, "services": "Personal care, Alzheimer's/dementia, companionship", "notes": "Central Nebraska coverage"},
    {"provider_name": "Seniors Helping Seniors Iowa City", "address": None, "city": "Iowa City", "state": "IA", "zip_code": None, "phone": "(319) 358-6444", "website": "https://seniorshelpingseniors.com/iowa-city", "contact_email": None, "services": "Companionship, daily living, light housekeeping", "notes": "Senior-to-senior model"},
    {"provider_name": "Acti-Kare Des Moines", "address": None, "city": "Des Moines", "state": "IA", "zip_code": None, "phone": "(515) 444-1270", "website": "https://actikare.com/des-moines", "contact_email": None, "services": "In-home senior care, respite, veteran care", "notes": "National franchise; Des Moines metro"},
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

    # Load existing leads for dedup
    cur.execute("SELECT provider_name, city, state FROM sales_leads")
    existing = set()
    for row in cur.fetchall():
        key = f"{normalize(row[0])}|{normalize(row[1] or '')}|{(row[2] or '').upper()}"
        existing.add(key)

    print(f"Existing leads in DB: {len(existing)}")
    print(f"New candidates: {len(NEW_AGENCIES)}")

    inserted = 0
    skipped_dup = 0
    skipped_self_dup = 0
    seen = set()

    for a in NEW_AGENCIES:
        name = a["provider_name"]
        city = a.get("city") or ""
        state = a.get("state") or ""
        key = f"{normalize(name)}|{normalize(city)}|{state.upper()}"

        if key in existing:
            skipped_dup += 1
            continue

        if key in seen:
            skipped_self_dup += 1
            continue
        seen.add(key)

        priority = "medium"
        source = "web_research_feb2026"

        cur.execute("""
            INSERT INTO sales_leads (
                provider_name, address, city, state, zip_code, phone,
                website, contact_email, notes, status, priority, source,
                ownership_type, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, 'new', %s, %s,
                %s, now(), now()
            )
        """, (
            name.strip(),
            a.get("address"),
            city,
            state,
            a.get("zip_code"),
            a.get("phone"),
            a.get("website"),
            a.get("contact_email"),
            f"{a.get('services', '')}. {a.get('notes', '')}".strip(". ") if a.get("services") or a.get("notes") else None,
            priority,
            source,
            "Other" if any(k in (a.get("services") or "").lower() for k in ["companion", "non-medical"]) else "Proprietary",
        ))
        inserted += 1
        existing.add(key)

    conn.commit()

    cur.execute("SELECT COUNT(*) FROM sales_leads")
    total = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM sales_leads WHERE contact_email IS NOT NULL AND contact_email != ''")
    with_email = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM sales_leads WHERE source = 'web_research_feb2026'")
    new_source = cur.fetchone()[0]

    cur.close()
    conn.close()

    print(f"\nResults:")
    print(f"  Inserted:              {inserted}")
    print(f"  Skipped (DB dup):      {skipped_dup}")
    print(f"  Skipped (self dup):    {skipped_self_dup}")
    print(f"\nDatabase totals:")
    print(f"  Total leads:           {total}")
    print(f"  With email:            {with_email}")
    print(f"  From web research:     {new_source}")


if __name__ == "__main__":
    main()
