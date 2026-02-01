#!/bin/bash
# SkillSync Docker Helper Script
# Purpose: Simplify Docker Compose operations, migrations, and service management
# Usage: ./docker-helper.sh [command] [options]

set -e

# =========================
# Configuration
# =========================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Docker Compose
DC="docker compose"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
DC_CMD="$DC -f $COMPOSE_FILE"

# Database
DB_CONTAINER="skillsync-postgres"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD:-Test@123}"
DB_PORT="${DB_PORT:-5433}"

# Service definitions: service_name:db_name:port
declare -A SERVICES=(
    ["auth"]="auth-service:skillsync_auth:3001"
    ["course"]="course-service:skillsync_course:3002"
)

# =========================
# Helper Functions
# =========================
print_header() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}"
}

print_step() {
    echo -e "${CYAN}➜ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

wait_for_postgres() {
    print_step "Waiting for PostgreSQL to be ready..."
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if docker exec $DB_CONTAINER pg_isready -U $DB_USER > /dev/null 2>&1; then
            print_success "PostgreSQL is ready"
            return 0
        fi
        echo -n "."
        sleep 1
        ((attempt++))
    done

    print_error "PostgreSQL failed to start within ${max_attempts}s"
    return 1
}

wait_for_redis() {
    print_step "Waiting for Redis to be ready..."
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if docker exec skillsync-redis redis-cli ping > /dev/null 2>&1; then
            print_success "Redis is ready"
            return 0
        fi
        echo -n "."
        sleep 1
        ((attempt++))
    done

    print_error "Redis failed to start within ${max_attempts}s"
    return 1
}

get_service_info() {
    local service_key=$1
    echo "${SERVICES[$service_key]}"
}

# =========================
# Usage
# =========================
show_usage() {
    print_header "SkillSync Docker Helper"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo -e "${CYAN}Setup Commands:${NC}"
    echo "  setup                 Full setup: start infra, all services, run all migrations"
    echo "  setup:infra           Start infrastructure only (postgres, redis)"
    echo "  setup:service <name>  Start infra + specific service + run its migrations"
    echo ""
    echo -e "${CYAN}Service Commands:${NC}"
    echo "  start                 Start all services"
    echo "  start:<service>       Start specific service (auth, course, learning, payment)"
    echo "  stop                  Stop all services"
    echo "  stop:<service>        Stop specific service"
    echo "  restart               Restart all services"
    echo "  restart:<service>     Restart specific service"
    echo "  rebuild               Rebuild and restart all services"
    echo "  rebuild:<service>     Rebuild and restart specific service"
    echo ""
    echo -e "${CYAN}Migration Commands:${NC}"
    echo "  migrate               Run all migrations"
    echo "  migrate:<service>     Run migrations for specific service"
    echo ""
    echo -e "${CYAN}Utility Commands:${NC}"
    echo "  logs [service]        View logs (all or specific service)"
    echo "  ps                    List running containers"
    echo "  health                Check health status of all services"
    echo "  shell <service>       Open shell in service container"
    echo "  db                    Connect to PostgreSQL CLI"
    echo "  db:<database>         Connect to specific database"
    echo "  clean                 Remove all containers and volumes"
    echo "  clean:full            Remove containers, volumes, and images"
    echo ""
    echo -e "${CYAN}Available Services:${NC}"
    echo "  auth, course, learning, payment"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo "  $0 setup                    # Full setup with all services"
    echo "  $0 setup:service auth       # Setup only auth service"
    echo "  $0 start:auth               # Start only auth service"
    echo "  $0 migrate:auth             # Run auth migrations"
    echo "  $0 logs auth-service        # View auth service logs"
    echo ""
}

# =========================
# Infrastructure Commands
# =========================
start_infra() {
    print_header "Starting Infrastructure"
    print_step "Starting PostgreSQL and Redis..."

    $DC_CMD up -d postgres redis

    wait_for_postgres
    wait_for_redis

    print_success "Infrastructure is running"
}

# =========================
# Migration Commands
# =========================
run_migration() {
    local service_key=$1
    local service_info=$(get_service_info "$service_key")

    if [ -z "$service_info" ]; then
        print_error "Unknown service: $service_key"
        echo "Available services: auth, course, learning, payment"
        return 1
    fi

    IFS=':' read -r service_name db_name port <<< "$service_info"
    local migration_dir="$PROJECT_ROOT/$service_name/src/migrations"

    print_step "Running migrations for $service_name -> $db_name"

    # Check if migration directory exists
    if [ ! -d "$migration_dir" ]; then
        print_warning "Migration directory not found: $migration_dir"
        return 0
    fi

    # Count migration files
    local migration_count=$(find "$migration_dir" -name "*.sql" 2>/dev/null | wc -l)

    if [ "$migration_count" -eq 0 ]; then
        print_warning "No migration files found in $migration_dir"
        return 0
    fi

    echo -e "${BLUE}Found ${migration_count} migration file(s)${NC}"

    # Run each migration in order
    for migration_file in $(ls -1 "$migration_dir"/*.sql 2>/dev/null | sort); do
        local filename=$(basename "$migration_file")
        print_step "Applying: $filename"

        if docker exec -i $DB_CONTAINER psql -U $DB_USER -d "$db_name" < "$migration_file"; then
            print_success "Migration applied: $filename"
        else
            print_error "Migration failed: $filename"
            return 1
        fi
    done

    print_success "All migrations completed for $service_name"
}

run_all_migrations() {
    print_header "Running All Migrations"

    for service_key in "${!SERVICES[@]}"; do
        run_migration "$service_key" || true
        echo ""
    done

    print_success "All migrations completed"
}

# =========================
# Service Commands
# =========================
start_service() {
    local service_key=$1
    local service_info=$(get_service_info "$service_key")

    if [ -z "$service_info" ]; then
        print_error "Unknown service: $service_key"
        return 1
    fi

    IFS=':' read -r service_name db_name port <<< "$service_info"

    print_step "Starting $service_name..."
    $DC_CMD up -d --build "$service_name"
    print_success "$service_name started"
}

stop_service() {
    local service_key=$1
    local service_info=$(get_service_info "$service_key")

    if [ -z "$service_info" ]; then
        print_error "Unknown service: $service_key"
        return 1
    fi

    IFS=':' read -r service_name db_name port <<< "$service_info"

    print_step "Stopping $service_name..."
    $DC_CMD stop "$service_name"
    print_success "$service_name stopped"
}

restart_service() {
    local service_key=$1
    local service_info=$(get_service_info "$service_key")

    if [ -z "$service_info" ]; then
        print_error "Unknown service: $service_key"
        return 1
    fi

    IFS=':' read -r service_name db_name port <<< "$service_info"

    print_step "Restarting $service_name..."
    $DC_CMD restart "$service_name"
    print_success "$service_name restarted"
}

rebuild_service() {
    local service_key=$1
    local service_info=$(get_service_info "$service_key")

    if [ -z "$service_info" ]; then
        print_error "Unknown service: $service_key"
        return 1
    fi

    IFS=':' read -r service_name db_name port <<< "$service_info"

    print_step "Rebuilding $service_name..."
    $DC_CMD up -d --build --force-recreate "$service_name"
    print_success "$service_name rebuilt and started"
}

start_all() {
    print_header "Starting All Services"
    $DC_CMD up -d --build
    print_success "All services started"
}

stop_all() {
    print_header "Stopping All Services"
    $DC_CMD down
    print_success "All services stopped"
}

restart_all() {
    print_header "Restarting All Services"
    $DC_CMD restart
    print_success "All services restarted"
}

rebuild_all() {
    print_header "Rebuilding All Services"
    $DC_CMD down
    $DC_CMD build --no-cache
    $DC_CMD up -d
    print_success "All services rebuilt and started"
}

# =========================
# Setup Commands
# =========================
full_setup() {
    print_header "Full SkillSync Setup"

    print_step "Step 1/3: Starting all containers..."
    $DC_CMD up -d --build

    wait_for_postgres
    wait_for_redis

    print_step "Step 2/3: Waiting for services to initialize..."
    sleep 5

    print_step "Step 3/3: Running all migrations..."
    run_all_migrations

    print_header "Setup Complete!"
    echo ""
    echo -e "${CYAN}Services are running at:${NC}"
    echo "  API Gateway: http://localhost"
    echo "  PostgreSQL:  localhost:5433"
    echo "  Redis:       localhost:6380"
    echo ""
    show_health
}

setup_service() {
    local service_key=$1

    if [ -z "$service_key" ]; then
        print_error "Please specify a service name"
        echo "Usage: $0 setup:service <auth|course|learning|payment>"
        return 1
    fi

    local service_info=$(get_service_info "$service_key")

    if [ -z "$service_info" ]; then
        print_error "Unknown service: $service_key"
        return 1
    fi

    IFS=':' read -r service_name db_name port <<< "$service_info"

    print_header "Setting up $service_name"

    print_step "Step 1/4: Starting infrastructure..."
    start_infra

    print_step "Step 2/4: Starting nginx..."
    $DC_CMD up -d nginx

    print_step "Step 3/4: Starting $service_name..."
    $DC_CMD up -d --build "$service_name"

    print_step "Step 4/4: Running migrations for $service_name..."
    sleep 3
    run_migration "$service_key"

    print_header "$service_name Setup Complete!"
    echo ""
    echo -e "${CYAN}Service is running at:${NC}"
    echo "  API: http://localhost/api/${service_key}/"
    echo ""
}

# =========================
# Utility Commands
# =========================
show_logs() {
    local service=$1

    if [ -n "$service" ]; then
        print_step "Viewing logs for $service..."
        $DC_CMD logs -f "$service"
    else
        print_step "Viewing logs for all services..."
        $DC_CMD logs -f
    fi
}

show_ps() {
    print_header "Running Containers"
    $DC_CMD ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
}

show_health() {
    print_header "Service Health Status"

    local all_services=("postgres" "redis" "auth-service" "course-service" "nginx")

    for service in "${all_services[@]}"; do
        local container_name="skillsync-${service}"
        local status=$(docker inspect --format='{{.State.Status}}' "$container_name" 2>/dev/null || echo "not found")
        local health=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no healthcheck{{end}}' "$container_name" 2>/dev/null || echo "")

        case "$status" in
            running)
                if [ "$health" = "healthy" ] || [ "$health" = "no healthcheck" ]; then
                    print_success "$service: running ($health)"
                elif [ "$health" = "starting" ]; then
                    print_warning "$service: starting..."
                else
                    print_error "$service: $health"
                fi
                ;;
            *)
                print_error "$service: $status"
                ;;
        esac
    done
}

open_shell() {
    local service=$1

    if [ -z "$service" ]; then
        print_error "Please specify a service name"
        echo "Available: auth-service, postgres, redis, nginx"
        return 1
    fi

    print_step "Opening shell in $service..."
    $DC_CMD exec "$service" sh
}

connect_db() {
    local database=${1:-postgres}

    print_step "Connecting to database: $database"
    docker exec -it $DB_CONTAINER psql -U $DB_USER -d "$database"
}

clean() {
    print_warning "This will remove all containers and volumes!"
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" = "yes" ]; then
        print_step "Cleaning up..."
        $DC_CMD down -v
        print_success "Cleanup complete"
    else
        print_warning "Cleanup cancelled"
    fi
}

clean_full() {
    print_warning "This will remove all containers, volumes, AND images!"
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" = "yes" ]; then
        print_step "Full cleanup..."
        $DC_CMD down -v --rmi all
        print_success "Full cleanup complete"
    else
        print_warning "Cleanup cancelled"
    fi
}

# =========================
# Main
# =========================
cd "$PROJECT_ROOT"

case "$1" in
    # Setup commands
    setup)
        full_setup
        ;;
    setup:infra)
        start_infra
        ;;
    setup:service)
        setup_service "$2"
        ;;

    # Start commands
    start)
        start_all
        ;;
    start:auth)
        start_service "auth"
        ;;
    start:course)
        start_service "course"
        ;;

    # Stop commands
    stop)
        stop_all
        ;;
    stop:auth)
        stop_service "auth"
        ;;
    stop:course)
        stop_service "course"
        ;;

    # Restart commands
    restart)
        restart_all
        ;;
    restart:auth)
        restart_service "auth"
        ;;
    restart:course)
        restart_service "course"
        ;;

    # Rebuild commands
    rebuild)
        rebuild_all
        ;;
    rebuild:auth)
        rebuild_service "auth"
        ;;
    rebuild:course)
        rebuild_service "course"
        ;;

    # Migration commands
    migrate)
        run_all_migrations
        ;;
    migrate:auth)
        run_migration "auth"
        ;;
    migrate:course)
        run_migration "course"
        ;;

    # Utility commands
    logs)
        show_logs "$2"
        ;;
    ps)
        show_ps
        ;;
    health)
        show_health
        ;;
    shell)
        open_shell "$2"
        ;;
    db)
        connect_db
        ;;
    db:auth)
        connect_db "skillsync_auth"
        ;;
    db:course)
        connect_db "skillsync_course"
        ;;
    clean)
        clean
        ;;
    clean:full)
        clean_full
        ;;

    # Help
    -h|--help|help|"")
        show_usage
        ;;

    *)
        print_error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac
