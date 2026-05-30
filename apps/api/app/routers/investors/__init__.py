"""
Investors package — CEO-ONLY.

Private CRM for investor / fundraising outreach (separate from Sales Leads,
which tracks agency prospects). Only accessible to platform admin accounts
(@palmtai.com).

Split out of a single 2,103-line investors.py:
  - common.py     brand constants, email wrapper, investor email templates
  - schemas.py    Pydantic request/response models
  - seed_data.py  the large curated _get_seed_investors() dataset
  - routes.py     all endpoints

`router` is re-exported so `from app.routers.investors import router` keeps
working unchanged.
"""

from .routes import router  # noqa: F401
