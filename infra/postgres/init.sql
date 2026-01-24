-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create initial schema (tables will be created by Alembic migrations)
-- This file is for any PostgreSQL-specific initialization

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE homecare TO homecare;
