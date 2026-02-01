#!/bin/bash
# SkillSync Database Initialization Script
# Purpose: Create separate databases for each microservice
# Runs automatically when PostgreSQL container starts

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}SkillSync Database Initialization${NC}"
echo -e "${GREEN}========================================${NC}"

# Function to create database
create_database() {
    local db_name=$1
    echo -e "${YELLOW}Creating database: ${db_name}${NC}"

    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
        CREATE DATABASE ${db_name};
        GRANT ALL PRIVILEGES ON DATABASE ${db_name} TO $POSTGRES_USER;
EOSQL

    echo -e "${GREEN}✓ Database ${db_name} created successfully${NC}"
}

# Create databases for each microservice
create_database "skillsync_auth"
create_database "skillsync_course"
create_database "skillsync_learning"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Database initialization complete!${NC}"
echo -e "${GREEN}========================================${NC}"

# Display created databases
echo -e "${YELLOW}Created databases:${NC}"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -c "\l" | grep skillsync
