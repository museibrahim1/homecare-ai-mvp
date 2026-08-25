"""Agency branding and document-fill helpers."""

from uuid import uuid4
from unittest.mock import MagicMock

from app.services.agency_branding import resolve_agency_branding
from app.services.agency_document_fill import (
    DOC_KIND_CONTRACT,
    get_active_document_template,
)


class TestResolveAgencyBranding:
    def test_uses_company_name_when_no_settings(self):
        user = MagicMock()
        user.id = uuid4()
        user.email = "owner@example.com"
        user.company_name = "Acme Home Care"
        user.business_id = None

        db = MagicMock()
        # visible_user_ids path queries users by email, then AgencySettings, then BusinessUser
        db.query.return_value.filter.return_value.all.return_value = [user]
        db.query.return_value.filter.return_value.order_by.return_value.first.return_value = None
        db.query.return_value.filter.return_value.first.return_value = None

        branding = resolve_agency_branding(db, user)
        assert branding["company_name"] == "Acme Home Care"
        assert branding["business_name"] == "Acme Home Care"
        assert branding["agency_logo"] is None

    def test_prefers_agency_settings_name_and_logo(self):
        user = MagicMock()
        user.id = uuid4()
        user.email = "owner@example.com"
        user.company_name = "Signup Name LLC"

        settings = MagicMock()
        settings.name = "Northern Lights Care"
        settings.logo = "data:image/png;base64,abc"
        settings.updated_at = "2026-01-01"

        # Simulate chained query results carefully via side effects is brittle;
        # call the function with a stub Session that returns settings first.
        class _Q:
            def __init__(self, result):
                self._result = result

            def filter(self, *a, **k):
                return self

            def order_by(self, *a, **k):
                return self

            def first(self):
                return self._result

            def all(self):
                return [user] if self._result is user else []

        class _DB:
            def __init__(self):
                self._calls = 0

            def query(self, model):
                name = getattr(model, "__name__", str(model))
                if "AgencySettings" in name or "agency_settings" in str(model).lower():
                    return _Q(settings)
                if "BusinessUser" in name or "Business" in name:
                    return _Q(None)
                if "User" in name:
                    return _Q(user)
                return _Q(None)

        branding = resolve_agency_branding(_DB(), user)
        assert branding["business_name"] == "Northern Lights Care"
        assert branding["agency_logo"] == "data:image/png;base64,abc"

    def test_skips_generic_sentinel_agency_name(self):
        user = MagicMock()
        user.id = uuid4()
        user.email = "owner@example.com"
        user.company_name = "Real Agency Inc"

        settings = MagicMock()
        settings.name = "Home Care Services Agency"
        settings.logo = None
        settings.updated_at = "2026-01-01"

        class _Q:
            def __init__(self, result):
                self._result = result

            def filter(self, *a, **k):
                return self

            def order_by(self, *a, **k):
                return self

            def first(self):
                return self._result

            def all(self):
                return [user]

        class _DB:
            def query(self, model):
                name = getattr(model, "__name__", str(model))
                if "AgencySettings" in name:
                    return _Q(settings)
                if "BusinessUser" in name or "Business" in name:
                    return _Q(None)
                return _Q(user)

        branding = resolve_agency_branding(_DB(), user)
        assert branding["business_name"] == "Real Agency Inc"


class TestGetActiveDocumentTemplate:
    def test_filters_by_doc_kind(self):
        user = MagicMock()
        user.id = uuid4()
        user.email = "a@b.com"

        template = MagicMock()
        template.doc_kind = DOC_KIND_CONTRACT

        class _Q:
            def filter(self, *a, **k):
                return self

            def order_by(self, *a, **k):
                return self

            def first(self):
                return template

            def all(self):
                return [user]

        class _DB:
            def query(self, model):
                return _Q()

        found = get_active_document_template(_DB(), user, doc_kind=DOC_KIND_CONTRACT)
        assert found is template
