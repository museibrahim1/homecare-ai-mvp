"""Cross-dialect column types.

Production runs on PostgreSQL, but the test suite runs on SQLite. Postgres-only
types like JSONB fail to compile there, which silently broke every test that
touches the DB. This JSONB renders as native JSONB on Postgres (no schema
change) and as generic JSON everywhere else.
"""
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB

JSONB = JSON().with_variant(PG_JSONB(), "postgresql")
