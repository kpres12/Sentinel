#!/bin/bash

# Production Deployment Script for Wildfire Operations Platform
# This script handles the complete production deployment process

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NAMESPACE="wildfire-ops"
CLUSTER_NAME="wildfire-ops-prod"
REGION="us-west-2"
BACKUP_ENABLED=true
HEALTH_CHECK_TIMEOUT=300
ROLLBACK_ON_FAILURE=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Error handling
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Deployment failed with exit code $exit_code"
        if [ "$ROLLBACK_ON_FAILURE" = true ]; then
            log_warning "Initiating rollback..."
            rollback_deployment
        fi
    fi
    exit $exit_code
}

trap cleanup EXIT

# Utility functions
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check required tools
    local required_tools=("kubectl" "docker" "helm" "aws" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is required but not installed"
            exit 1
        fi
    done
    
    # Check kubectl context
    local current_context=$(kubectl config current-context)
    if [[ "$current_context" != *"$CLUSTER_NAME"* ]]; then
        log_error "kubectl context is not set to production cluster: $CLUSTER_NAME"
        log_info "Current context: $current_context"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi
    
    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_warning "Namespace $NAMESPACE does not exist, creating..."
        kubectl create namespace "$NAMESPACE"
    fi
    
    log_success "Prerequisites check passed"
}

validate_environment() {
    log_info "Validating environment configuration..."
    
    # Load .env.production if it exists
    if [ -f "$PROJECT_ROOT/.env.production" ]; then
        log_info "Loading environment from .env.production"
        set -a
        source "$PROJECT_ROOT/.env.production"
        set +a
    else
        log_error ".env.production file not found at $PROJECT_ROOT/.env.production"
        log_error "Create it from .env.production.template and fill in all required values"
        exit 1
    fi
    
    # Check required environment variables
    local required_vars=(
        "DATABASE_URL"
        "SECRET_KEY"
        "POSTGRES_PASSWORD"
        "REDIS_PASSWORD"
        "EMQX_PASSWORD"
        "ALLOWED_ORIGINS"
        "ALLOWED_HOSTS"
        "NEXT_PUBLIC_API_URL"
        "NEXT_PUBLIC_MQTT_WS_URL"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Required environment variables are not set:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        log_error "Please set these in .env.production"
        exit 1
    fi
    
    # Validate no default passwords are used
    local insecure_passwords=("wildfire123" "admin123" "password" "your-secret-key-here")
    for insecure in "${insecure_passwords[@]}"; do
        if [[ "$DATABASE_URL" == *"$insecure"* ]] || 
           [[ "$POSTGRES_PASSWORD" == *"$insecure"* ]] ||
           [[ "$SECRET_KEY" == *"$insecure"* ]]; then
            log_error "Insecure default password detected: $insecure"
            log_error "Please generate secure passwords before deploying"
            exit 1
        fi
    done
    
    # Validate ALLOWED_HOSTS doesn't contain wildcard
    if [[ "$ALLOWED_HOSTS" == *"*"* ]]; then
        log_error "ALLOWED_HOSTS contains wildcard '*' which is insecure in production"
        log_error "Please specify exact hostnames"
        exit 1
    fi
    
    # Validate secrets exist in Kubernetes
    local required_secrets=(
        "postgresql-credentials"
        "redis-credentials"
        "jwt-secrets"
        "summit-api-credentials"
        "mqtt-credentials"
    )
    
    for secret in "${required_secrets[@]}"; do
        if ! kubectl get secret "$secret" -n "$NAMESPACE" &> /dev/null; then
            log_error "Required secret $secret does not exist in namespace $NAMESPACE"
            exit 1
        fi
    done
    
    log_success "Environment validation passed"
}

backup_current_deployment() {
    if [ "$BACKUP_ENABLED" = false ]; then
        log_info "Backup disabled, skipping..."
        return
    fi
    
    log_info "Creating backup of current deployment..."
    
    local backup_dir="$PROJECT_ROOT/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup Kubernetes resources
    kubectl get all -n "$NAMESPACE" -o yaml > "$backup_dir/kubernetes-resources.yaml"
    kubectl get configmaps -n "$NAMESPACE" -o yaml > "$backup_dir/configmaps.yaml"
    kubectl get secrets -n "$NAMESPACE" -o yaml > "$backup_dir/secrets.yaml"
    
    # Backup database
    log_info "Creating database backup..."
    kubectl exec -n "$NAMESPACE" deployment/postgresql -- pg_dump \
        -U "$DATABASE_USER" -d "$DATABASE_NAME" \
        --clean --if-exists --create \
        > "$backup_dir/database-backup.sql"
    
    # Compress backup
    tar -czf "$backup_dir.tar.gz" -C "$(dirname "$backup_dir")" "$(basename "$backup_dir")"
    rm -rf "$backup_dir"
    
    # Upload to S3
    aws s3 cp "$backup_dir.tar.gz" "s3://wildfire-ops-backups/deployments/"
    
    log_success "Backup created: $backup_dir.tar.gz"
}

build_and_push_images() {
    log_info "Building and pushing Docker images..."
    
    # Validate AWS credentials and account ID
    if [ -z "${AWS_ACCOUNT_ID:-}" ]; then
        log_error "AWS_ACCOUNT_ID environment variable is not set"
        exit 1
    fi
    
    # Set image registry
    local registry="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
    local tag="${GITHUB_SHA:-$(git rev-parse HEAD)}"
    
    log_info "Using registry: $registry"
    log_info "Image tag: $tag"
    
    # Login to ECR
    log_info "Logging in to AWS ECR..."
    if ! aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$registry" 2>&1; then
        log_error "Failed to login to AWS ECR. Check AWS credentials and permissions"
        exit 1
    fi
    
    # Build images
    local services=("console" "apigw" "edge-agent" "summit-integration")
    
    for service in "${services[@]}"; do
        log_info "Building $service image..."
        
        docker build \
            -t "$registry/wildfire-$service:$tag" \
            -t "$registry/wildfire-$service:latest" \
            -f "apps/$service/Dockerfile" \
            .
        
        # Push images
        docker push "$registry/wildfire-$service:$tag"
        docker push "$registry/wildfire-$service:latest"
        
        log_success "$service image built and pushed"
    done
}

update_kubernetes_manifests() {
    log_info "Updating Kubernetes manifests..."
    
    local tag="${GITHUB_SHA:-$(git rev-parse HEAD)}"
    local registry="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
    
    # Update image tags in deployment files
    find "$PROJECT_ROOT/infra/k8s" -name "*.yaml" -exec sed -i.bak \
        "s|image: wildfire-|image: $registry/wildfire-|g" {} \;
    find "$PROJECT_ROOT/infra/k8s" -name "*.yaml" -exec sed -i.bak \
        "s|:latest|:$tag|g" {} \;
    
    # Clean up backup files
    find "$PROJECT_ROOT/infra/k8s" -name "*.bak" -delete
    
    log_success "Kubernetes manifests updated"
}

deploy_infrastructure() {
    log_info "Deploying infrastructure components..."
    
    # Deploy in order of dependencies
    local components=(
        "namespace.yaml"
        "secrets.yaml"
        "configmaps.yaml"
        "postgresql.yaml"
        "redis.yaml"
        "mqtt.yaml"
        "monitoring.yaml"
    )
    
    for component in "${components[@]}"; do
        if [ -f "$PROJECT_ROOT/infra/k8s/$component" ]; then
            log_info "Deploying $component..."
            kubectl apply -f "$PROJECT_ROOT/infra/k8s/$component" -n "$NAMESPACE"
        fi
    done
    
    # Wait for infrastructure to be ready
    log_info "Waiting for infrastructure to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgresql -n "$NAMESPACE" --timeout=300s
    kubectl wait --for=condition=ready pod -l app=redis -n "$NAMESPACE" --timeout=300s
    kubectl wait --for=condition=ready pod -l app=mqtt -n "$NAMESPACE" --timeout=300s
    
    log_success "Infrastructure deployment completed"
}

deploy_applications() {
    log_info "Deploying application components..."
    
    # Deploy applications
    local apps=(
        "api-gateway.yaml"
        "console.yaml"
        "edge-agent.yaml"
        "summit-integration.yaml"
    )
    
    for app in "${apps[@]}"; do
        if [ -f "$PROJECT_ROOT/infra/k8s/$app" ]; then
            log_info "Deploying $app..."
            kubectl apply -f "$PROJECT_ROOT/infra/k8s/$app" -n "$NAMESPACE"
        fi
    done
    
    # Deploy load balancer and ingress
    kubectl apply -f "$PROJECT_ROOT/infra/k8s/load-balancer.yaml" -n "$NAMESPACE"
    
    log_success "Application deployment completed"
}

run_database_migrations() {
    log_info "Running database migrations..."
    
    # Create migration job
    kubectl create job migration-$(date +%s) \
        --from=cronjob/database-migration \
        -n "$NAMESPACE"
    
    # Wait for migration to complete
    kubectl wait --for=condition=complete job -l job-name=migration \
        -n "$NAMESPACE" --timeout=600s
    
    log_success "Database migrations completed"
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check all pods are running
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        local pending_pods=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running --no-headers | wc -l)
        
        if [ "$pending_pods" -eq 0 ]; then
            break
        fi
        
        log_info "Waiting for $pending_pods pods to be ready... (attempt $((attempt + 1))/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "Deployment verification failed: pods not ready within timeout"
        kubectl get pods -n "$NAMESPACE"
        exit 1
    fi
    
    # Health checks
    log_info "Running health checks..."
    
    # API Gateway health check
    local api_url=$(kubectl get service wildfire-api-gateway-lb -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    if ! curl -f "http://$api_url/health" &> /dev/null; then
        log_error "API Gateway health check failed"
        exit 1
    fi
    
    # Console health check
    local console_url=$(kubectl get service wildfire-console-lb -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    if ! curl -f "http://$console_url" &> /dev/null; then
        log_error "Console health check failed"
        exit 1
    fi
    
    # Database connectivity check
    if ! kubectl exec -n "$NAMESPACE" deployment/wildfire-api-gateway -- \
        python -c "import psycopg2; psycopg2.connect('$DATABASE_URL')" &> /dev/null; then
        log_error "Database connectivity check failed"
        exit 1
    fi
    
    log_success "Deployment verification passed"
}

rollback_deployment() {
    log_warning "Rolling back deployment..."
    
    # Check if deployments exist before attempting rollback
    if ! kubectl get deployment wildfire-api-gateway -n "$NAMESPACE" &> /dev/null; then
        log_error "No existing deployment found - cannot rollback first deployment"
        log_error "Manual cleanup may be required"
        return 1
    fi
    
    # Get rollout history
    local history=$(kubectl rollout history deployment/wildfire-api-gateway -n "$NAMESPACE" 2>/dev/null | grep -v REVISION | wc -l)
    
    if [ "$history" -lt 2 ]; then
        log_error "No previous revision found for rollback (this may be the first deployment)"
        log_error "Manual rollback required - consider deleting failed resources"
        return 1
    fi
    
    # Rollback deployments
    log_info "Rolling back to previous revision..."
    kubectl rollout undo deployment/wildfire-api-gateway -n "$NAMESPACE" || log_error "Failed to rollback api-gateway"
    kubectl rollout undo deployment/wildfire-console -n "$NAMESPACE" || log_error "Failed to rollback console"
    
    # Wait for rollback to complete
    if kubectl rollout status deployment/wildfire-api-gateway -n "$NAMESPACE" --timeout=300s && \
       kubectl rollout status deployment/wildfire-console -n "$NAMESPACE" --timeout=300s; then
        log_success "Rollback completed successfully"
        return 0
    else
        log_error "Rollback failed or timed out"
        return 1
    fi
}

send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🔥 Wildfire Ops Deployment $status: $message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    if [ -n "${EMAIL_NOTIFICATION:-}" ]; then
        echo "$message" | mail -s "Wildfire Ops Deployment $status" "$EMAIL_NOTIFICATION"
    fi
}

# Main deployment function
main() {
    log_info "Starting production deployment of Wildfire Operations Platform"
    log_info "Cluster: $CLUSTER_NAME"
    log_info "Namespace: $NAMESPACE"
    log_info "Region: $REGION"
    
    # Deployment steps (validate_environment will load .env.production)
    check_prerequisites
    validate_environment
    backup_current_deployment
    build_and_push_images
    update_kubernetes_manifests
    deploy_infrastructure
    run_database_migrations
    deploy_applications
    verify_deployment
    
    log_success "🎉 Production deployment completed successfully!"
    
    # Get service URLs
    local api_url=$(kubectl get service wildfire-api-gateway-lb -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    local console_url=$(kubectl get service wildfire-console-lb -n "$NAMESPACE" -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    
    log_info "Service URLs:"
    log_info "  API Gateway: http://$api_url"
    log_info "  Console: http://$console_url"
    log_info "  MQTT Dashboard: http://$api_url:18083"
    
    send_notification "SUCCESS" "Deployment completed successfully. API: $api_url, Console: $console_url"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-backup)
            BACKUP_ENABLED=false
            shift
            ;;
        --no-rollback)
            ROLLBACK_ON_FAILURE=false
            shift
            ;;
        --cluster)
            CLUSTER_NAME="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --no-backup      Skip backup creation"
            echo "  --no-rollback    Disable automatic rollback on failure"
            echo "  --cluster NAME   Kubernetes cluster name"
            echo "  --namespace NAME Kubernetes namespace"
            echo "  --region REGION  AWS region"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main deployment
main
