#!/bin/bash
# SkillSync Centralized Migration Runner
# Runs database migrations for all microservices against Docker PostgreSQL
# Usage: ./scripts/run-migrations.sh [service_name]
# Examples:
#   ./scripts/run-migrations.sh          # Run all services
#   ./scripts/run-migrations.sh auth     # Run only auth-service
#   ./scripts/run-migrations.sh payment  # Run only payment-service

set -e

# ==========================================
# Configuration
# ==========================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Resolve project root (parent of scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Docker container name
POSTGRES_CONTAINER="skillsync-postgres"

# Load DB credentials from root .env if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    # Extract POSTGRES_USER and POSTGRES_PASSWORD, stripping inline comments
    DB_USER=$(grep -E '^POSTGRES_USER=' "$PROJECT_ROOT/.env" | cut -d'=' -f2 | sed 's/#.*//' | xargs)
    DB_PASSWORD=$(grep -E '^POSTGRES_PASSWORD=' "$PROJECT_ROOT/.env" | cut -d'=' -f2 | sed 's/#.*//' | xargs)
fi

DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

# Service to database mapping
declare -A SERVICE_DB_MAP=(
    ["auth"]="skillsync_auth"
    ["course"]="skillsync_course"
    ["learning"]="skillsync_learning"
    ["payment"]="skillsync_payment"
)

# Service to migration directory mapping
declare -A SERVICE_MIGRATION_DIR=(
    ["auth"]="$PROJECT_ROOT/auth-service/src/migrations"
    ["course"]="$PROJECT_ROOT/course-service/src/migrations"
    ["learning"]="$PROJECT_ROOT/learning-service/src/migrations"
    ["payment"]="$PROJECT_ROOT/payment-service/src/migrations"
)

# Ordered list of services (auth first since others may depend on it)
SERVICES_ORDER=("auth" "course" "learning" "payment")

# Counters
TOTAL_APPLIED=0
TOTAL_SKIPPED=0
FAILED=0

# ==========================================
# Helper Functions
# ==========================================

log_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Execute SQL against a specific database inside the Docker container
exec_sql() {
    local db_name="$1"
    local sql="$2"
    docker exec -i "$POSTGRES_CONTAINER" \
        psql -U "$DB_USER" -d "$db_name" -t -A -c "$sql" 2>/dev/null
}

# Execute a SQL file against a specific database inside the Docker container
exec_sql_file() {
    local db_name="$1"
    local file_path="$2"
    docker exec -i "$POSTGRES_CONTAINER" \
        psql -U "$DB_USER" -d "$db_name" -v ON_ERROR_STOP=1 < "$file_path"
}

# ==========================================
# Pre-flight Checks
# ==========================================

preflight_checks() {
    echo -e "${BLUE}Running pre-flight checks...${NC}"

    # Check Docker is running
    if ! docker info &>/dev/null; then
        echo -e "${RED}Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi

    # Check PostgreSQL container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
        echo -e "${RED}PostgreSQL container '${POSTGRES_CONTAINER}' is not running.${NC}"
        echo -e "${YELLOW}Start it with: docker compose up -d postgres${NC}"
        exit 1
    fi

    # Check PostgreSQL is accepting connections
    if ! docker exec "$POSTGRES_CONTAINER" pg_isready -U "$DB_USER" &>/dev/null; then
        echo -e "${RED}PostgreSQL is not ready to accept connections.${NC}"
        exit 1
    fi

    echo -e "${GREEN}All pre-flight checks passed.${NC}"
}

# ==========================================
# Migration Tracking
# ==========================================

# Check if schema_migrations table exists in a database
has_migration_table() {
    local db_name="$1"
    local exists
    exists=$(exec_sql "$db_name" "SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations' AND table_schema = 'public';")
    [ "$exists" = "1" ]
}

# Create schema_migrations table in a database if it doesn't exist
ensure_migration_table() {
    local db_name="$1"
    exec_sql "$db_name" "
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
            migration_name VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    " >/dev/null
}

# Count user-created tables in a database (excluding schema_migrations)
count_user_tables() {
    local db_name="$1"
    exec_sql "$db_name" "
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name != 'schema_migrations';
    "
}

# Count tracked migrations
count_tracked_migrations() {
    local db_name="$1"
    exec_sql "$db_name" "SELECT COUNT(*) FROM schema_migrations;"
}

# Auto-baseline: mark all existing migration files as applied when the
# database already has tables but no migration tracking yet
auto_baseline() {
    local db_name="$1"
    shift
    local files=("$@")

    local user_tables
    user_tables=$(count_user_tables "$db_name")
    local tracked
    tracked=$(count_tracked_migrations "$db_name")

    if [ "$user_tables" -gt 0 ] && [ "$tracked" -eq 0 ]; then
        echo -e "  ${YELLOW}Detected existing tables with no migration history.${NC}"
        echo -e "  ${YELLOW}Auto-baselining ${#files[@]} migration(s) as already applied...${NC}"
        for f in "${files[@]}"; do
            local fname
            fname=$(basename "$f")
            record_migration "$db_name" "$fname"
            echo -e "  ${YELLOW}↷ Baseline${NC}  $fname"
            TOTAL_SKIPPED=$((TOTAL_SKIPPED + 1))
        done
        return 0
    fi
    return 1
}

# Check if a migration has already been applied
is_migration_applied() {
    local db_name="$1"
    local migration_name="$2"
    local count
    count=$(exec_sql "$db_name" "SELECT COUNT(*) FROM schema_migrations WHERE migration_name = '$migration_name';")
    [ "$count" -gt 0 ]
}

# Record a migration as applied
record_migration() {
    local db_name="$1"
    local migration_name="$2"
    exec_sql "$db_name" "INSERT INTO schema_migrations (migration_name) VALUES ('$migration_name');" >/dev/null
}

# ==========================================
# Migration Runner
# ==========================================

run_service_migrations() {
    local service_name="$1"
    local db_name="${SERVICE_DB_MAP[$service_name]}"
    local migration_dir="${SERVICE_MIGRATION_DIR[$service_name]}"
    local service_applied=0
    local service_skipped=0

    log_header "${service_name}-service  →  ${db_name}"

    # Check migration directory exists
    if [ ! -d "$migration_dir" ]; then
        echo -e "${YELLOW}  No migrations directory found at: ${migration_dir}${NC}"
        return 0
    fi

    # Find SQL migration files
    local migration_files=()
    while IFS= read -r -d '' file; do
        migration_files+=("$file")
    done < <(find "$migration_dir" -maxdepth 1 -name '*.sql' -print0 | sort -z)

    if [ ${#migration_files[@]} -eq 0 ]; then
        echo -e "${YELLOW}  No .sql migration files found${NC}"
        return 0
    fi

    echo -e "${BLUE}  Found ${#migration_files[@]} migration file(s)${NC}"

    # Check database exists
    local db_exists
    db_exists=$(docker exec "$POSTGRES_CONTAINER" \
        psql -U "$DB_USER" -t -A -c "SELECT 1 FROM pg_database WHERE datname = '$db_name';" 2>/dev/null)

    if [ "$db_exists" != "1" ]; then
        echo -e "${YELLOW}  Database '$db_name' does not exist. Creating...${NC}"
        docker exec "$POSTGRES_CONTAINER" \
            psql -U "$DB_USER" -c "CREATE DATABASE $db_name;" 2>/dev/null
        echo -e "${GREEN}  Created database '$db_name'${NC}"
    fi

    # Ensure migration tracking table exists
    ensure_migration_table "$db_name"

    # Auto-baseline if DB already has tables but no migration records
    if auto_baseline "$db_name" "${migration_files[@]}"; then
        echo -e "  ${GREEN}✓ ${service_name}-service: baselined (run again to apply new migrations)${NC}"
        return 0
    fi

    # Run each migration
    for migration_file in "${migration_files[@]}"; do
        local filename
        filename=$(basename "$migration_file")

        if is_migration_applied "$db_name" "$filename"; then
            echo -e "  ${YELLOW}↷ Skip${NC}  $filename (already applied)"
            service_skipped=$((service_skipped + 1))
            TOTAL_SKIPPED=$((TOTAL_SKIPPED + 1))
            continue
        fi

        echo -ne "  ${BLUE}▶ Run${NC}   $filename ... "

        # Run migration inside a transaction
        if exec_sql_file "$db_name" "$migration_file" >/dev/null 2>&1; then
            record_migration "$db_name" "$filename"
            echo -e "${GREEN}done${NC}"
            service_applied=$((service_applied + 1))
            TOTAL_APPLIED=$((TOTAL_APPLIED + 1))
        else
            echo -e "${RED}FAILED${NC}"
            echo -e "${RED}  Error applying $filename to $db_name${NC}"
            echo -e "${RED}  Re-running with output for debugging:${NC}"
            exec_sql_file "$db_name" "$migration_file" 2>&1 || true
            FAILED=$((FAILED + 1))
            return 1
        fi
    done

    echo -e "  ${GREEN}✓ ${service_name}-service: ${service_applied} applied, ${service_skipped} skipped${NC}"
}

# ==========================================
# Main
# ==========================================

main() {
    log_header "SkillSync Migration Runner"

    preflight_checks

    local target_service="$1"

    if [ -n "$target_service" ]; then
        # Run for a specific service
        if [ -z "${SERVICE_DB_MAP[$target_service]}" ]; then
            echo -e "${RED}Unknown service: $target_service${NC}"
            echo ""
            echo "Available services: ${SERVICES_ORDER[*]}"
            echo "Usage: $0 [auth|course|learning|payment]"
            exit 1
        fi
        run_service_migrations "$target_service"
    else
        # Run for all services in order
        for service in "${SERVICES_ORDER[@]}"; do
            run_service_migrations "$service"
        done
    fi

    # Summary
    log_header "Summary"
    echo -e "  Applied: ${GREEN}${TOTAL_APPLIED}${NC}"
    echo -e "  Skipped: ${YELLOW}${TOTAL_SKIPPED}${NC}"
    echo -e "  Failed:  ${RED}${FAILED}${NC}"

    if [ "$FAILED" -gt 0 ]; then
        echo ""
        echo -e "${RED}Some migrations failed. Check the output above.${NC}"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}All migrations completed successfully!${NC}"
}

main "$@"
