#!/bin/bash
# SkillSync Migration Runner
# Purpose: Run database migrations for all services
# Usage: ./scripts/run-migrations.sh [service_name]

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Database connection defaults
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-Test@123}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}SkillSync Migration Runner${NC}"
echo -e "${GREEN}========================================${NC}"

# Function to run migrations for a service
run_service_migrations() {
    local service=$1
    local db_name=$2
    local migration_dir=$3

    echo -e "${YELLOW}Running migrations for ${service}...${NC}"

    # Check if migration directory exists
    if [ ! -d "$migration_dir" ]; then
        echo -e "${RED}✗ Migration directory not found: ${migration_dir}${NC}"
        return 1
    fi

    # Count migration files
    migration_count=$(ls -1 ${migration_dir}/*.sql 2>/dev/null | wc -l)

    if [ "$migration_count" -eq 0 ]; then
        echo -e "${YELLOW}No migration files found in ${migration_dir}${NC}"
        return 0
    fi

    echo -e "${BLUE}Found ${migration_count} migration file(s)${NC}"

    # Run each migration in order
    for migration_file in ${migration_dir}/*.sql; do
        if [ -f "$migration_file" ]; then
            echo -e "${BLUE}Applying: $(basename $migration_file)${NC}"
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $db_name -f "$migration_file"

            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Migration applied successfully${NC}"
            else
                echo -e "${RED}✗ Migration failed${NC}"
                exit 1
            fi
        fi
    done

    echo -e "${GREEN}✓ All migrations completed for ${service}${NC}"
    echo ""
}

# Main execution
if [ -n "$1" ]; then
    # Run migrations for specific service
    case $1 in
        auth)
            run_service_migrations "Auth Service" "skillsync_auth" "../auth-service/src/migrations"
            ;;
            *)
            echo -e "${RED}Unknown service: $1${NC}"
            echo "Usage: $0 [auth|course|learning|payment]"
            exit 1
            ;;
    esac
else
    # Run migrations for all services
    run_service_migrations "Auth Service" "skillsync_auth" "../auth-service/src/migrations"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All migrations completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
