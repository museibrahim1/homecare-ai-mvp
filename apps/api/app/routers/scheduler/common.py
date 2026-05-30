"""Shared in-memory stores and constants for the scheduler package.

The in-memory dicts are module-level singletons; route modules import and
mutate them in place so state is shared across the package exactly as it was
in the original single-module router.
"""


_scheduled_demos: dict[str, dict] = {}
_team_goals: dict[str, dict] = {}
_marketing_assets: dict[str, dict] = {}

INSPIRING_MESSAGES = [
    "Every call is a chance to change someone's care journey. You've got this!",
    "Small consistent actions create massive results. Keep pushing!",
    "You're not just selling software — you're transforming healthcare.",
    "One more call could be the one that changes everything.",
    "The agencies you're reaching out to NEED what we're building.",
    "Your persistence today creates the revenue that fuels our mission.",
    "Champions aren't born — they're made one call at a time.",
    "Think about the caregivers who'll get their evenings back because of your work.",
    "Every 'no' gets you closer to the next 'yes'. Stay hungry.",
    "The team is counting on you — and you always deliver.",
    "You're building the future of home care. Own it.",
    "Picture the agency owner who'll thank you in 6 months. That call is today.",
]

STATE_REGIONS = {
    "northeast": ["CT", "ME", "MA", "NH", "NJ", "NY", "PA", "RI", "VT"],
    "southeast": ["AL", "AR", "FL", "GA", "KY", "LA", "MS", "NC", "SC", "TN", "VA", "WV"],
    "midwest": ["IL", "IN", "IA", "KS", "MI", "MN", "MO", "NE", "ND", "OH", "SD", "WI"],
    "southwest": ["AZ", "NM", "OK", "TX"],
    "west": ["AK", "CA", "CO", "HI", "ID", "MT", "NV", "OR", "UT", "WA", "WY"],
    "mid_atlantic": ["DC", "DE", "MD"],
}


def _region_for_state(state: str) -> str:
    st = state.upper().strip()
    for region, states in STATE_REGIONS.items():
        if st in states:
            return region
    return "other"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TERRITORY / STATE ASSIGNMENTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALL_STATES = sorted(
    set(st for states in STATE_REGIONS.values() for st in states)
)

STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DC": "Washington DC",
    "DE": "Delaware", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii",
    "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine",
    "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska",
    "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico",
    "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island",
    "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas",
    "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
}
