"""
Business Authentication package.

Handles business registration, verification, login, magic-link sign-in,
profile, and team management.

Split out of a single 1,249-line business_auth.py:
  - common.py        security-sensitive auth helpers (hash/verify/JWT) + constants
  - registration.py  registration flow, SOS verify, document upload, status
  - login.py         login + password reset request/confirm
  - magic_link.py    passwordless one-tap email sign-in
  - profile.py       authenticated business profile get/update
  - team.py          team management + plan limits + legacy user endpoints

The auth helpers are kept verbatim in common.py to preserve the recently
hardened authentication behavior. `router` is re-exported so
`from app.routers.business_auth import router` (mounted at /auth/business)
keeps working unchanged.
"""

from fastapi import APIRouter

from .registration import router as _registration_router
from .login import router as _login_router
from .magic_link import router as _magic_link_router
from .profile import router as _profile_router
from .team import router as _team_router

router = APIRouter()
router.include_router(_registration_router)
router.include_router(_login_router)
router.include_router(_magic_link_router)
router.include_router(_profile_router)
router.include_router(_team_router)
