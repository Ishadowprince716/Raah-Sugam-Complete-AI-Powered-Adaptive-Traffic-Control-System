#!/bin/bash

# Jetson Nano Deployment Script for Raah-Sugam Edge Service
# Project Raah-Sugam - AI-Powered Adaptive Traffic Control
#
# This script deploys the edge AI service to NVIDIA Jetson Nano devices
# with proper GPU acceleration and TensorRT optimization.
#
# Usage: ./jetson_deploy.sh <jetson-ip> <username> [options]
#
# Author: Raah-Sugam Team
# License: MIT

set -e  # Exit on any error

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
EDGE_DIR="${PROJECT_ROOT}/edge"

# Default values
JETSON_USER="nvidia"
JETSON_IP=""
SSH_KEY=""
CONTAINER_NAME="raah-sugam-edge"
IMAGE_NAME="raah-sugam-edge:jetson"
DEPLOY_ENV="production"
ENABLE_GPU=true
ENABLE_TENSORRT=false

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

# Usage information
show_usage() {
    cat << EOF
Usage: $0 <jetson-ip> <username> [options]

Deploy Raah-Sugam edge AI service to NVIDIA Jetson Nano device.

ARGUMENTS:
    jetson-ip       IP address of the Jetson Nano device
    username        SSH username for the Jetson device (default: nvidia)

OPTIONS:
    -k, --ssh-key PATH          Path to SSH private key
    -n, --name NAME             Container name (default: raah-sugam-edge)
    -i, --image NAME            Docker image name (default: raah-sugam-edge:jetson)
    -e, --env ENV               Deployment environment (default: production)
    --no-gpu                    Disable GPU acceleration
    --enable-tensorrt           Enable TensorRT optimization
    --dry-run                   Show commands without executing
    -h, --help                  Show this help message

EXAMPLES:
    $0 192.168.1.100 nvidia
    $0 192.168.1.100 nvidia --ssh-key ~/.ssh/jetson_key
    $0 192.168.1.100 nvidia --enable-tensorrt --name traffic-controller

REQUIREMENTS:
    - Docker installed on Jetson Nano
    - NVIDIA Container Toolkit configured
    - SSH access to Jetson device
    - Sufficient storage space (>8GB recommended)

EOF
}

# Parse command line arguments
parse_args() {
    if [[ $# -lt 2 ]]; then
        log_error "Missing required arguments"
        show_usage
        exit 1
    fi

    JETSON_IP="$1"
    JETSON_USER="$2"
    shift 2

    while [[ $# -gt 0 ]]; do
        case $1 in
            -k|--ssh-key)
                SSH_KEY="$2"
                shift 2
                ;;
            -n|--name)
                CONTAINER_NAME="$2"
                shift 2
                ;;
            -i|--image)
                IMAGE_NAME="$2"
                shift 2
                ;;
            -e|--env)
                DEPLOY_ENV="$2"
                shift 2
                ;;
            --no-gpu)
                ENABLE_GPU=false
                shift
                ;;
            --enable-tensorrt)
                ENABLE_TENSORRT=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Execute command with optional dry-run
execute_cmd() {
    local cmd="$1"
    local description="$2"
    
    if [[ -n "$description" ]]; then
        log_info "$description"
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "DRY RUN: $cmd"
    else
        eval "$cmd"
    fi
}

# SSH command wrapper
ssh_cmd() {
    local cmd="$1"
    local ssh_opts=""
    
    if [[ -n "$SSH_KEY" ]]; then
        ssh_opts="-i $SSH_KEY"
    fi
    
    ssh $ssh_opts -o StrictHostKeyChecking=no "${JETSON_USER}@${JETSON_IP}" "$cmd"
}

# SCP file transfer wrapper
scp_file() {
    local src="$1"
    local dst="$2"
    local ssh_opts=""
    
    if [[ -n "$SSH_KEY" ]]; then
        ssh_opts="-i $SSH_KEY"
    fi
    
    scp $ssh_opts -o StrictHostKeyChecking=no "$src" "${JETSON_USER}@${JETSON_IP}:$dst"
}

# Validate prerequisites
validate_prerequisites() {
    log_info "Validating prerequisites..."
    
    # Check if edge directory exists
    if [[ ! -d "$EDGE_DIR" ]]; then
        log_error "Edge directory not found: $EDGE_DIR"
        exit 1
    fi
    
    # Check if Dockerfile exists
    if [[ ! -f "$EDGE_DIR/Dockerfile" ]]; then
        log_error "Dockerfile not found in edge directory"
        exit 1
    fi
    
    # Validate IP address format
    if ! [[ "$JETSON_IP" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        log_error "Invalid IP address format: $JETSON_IP"
        exit 1
    fi
    
    # Check SSH connectivity
    log_info "Testing SSH connectivity to $JETSON_IP..."
    if ! ssh_cmd "echo 'SSH connection successful'" > /dev/null 2>&1; then
        log_error "Cannot establish SSH connection to $JETSON_IP"
        exit 1
    fi
    
    log_success "Prerequisites validated"
}

# Check Jetson system information
check_jetson_system() {
    log_info "Checking Jetson system information..."
    
    # Get system info
    local jetpack_version=$(ssh_cmd "cat /etc/nv_tegra_release 2>/dev/null || echo 'Unknown'")
    local docker_version=$(ssh_cmd "docker --version 2>/dev/null || echo 'Not installed'")
    local gpu_info=$(ssh_cmd "nvidia-smi -L 2>/dev/null || echo 'GPU not detected'")
    
    log_info "JetPack Version: $jetpack_version"
    log_info "Docker Version: $docker_version"
    log_info "GPU Info: $gpu_info"
    
    # Check if Docker is installed
    if ssh_cmd "which docker" > /dev/null 2>&1; then
        log_success "Docker is installed"
    else
        log_error "Docker is not installed on Jetson device"
        log_info "Please install Docker and NVIDIA Container Toolkit first"
        exit 1
    fi
    
    # Check NVIDIA Container Toolkit
    if ssh_cmd "docker info | grep -i nvidia" > /dev/null 2>&1; then
        log_success "NVIDIA Container Toolkit is configured"
    else
        log_warning "NVIDIA Container Toolkit may not be configured"
        if [[ "$ENABLE_GPU" == "true" ]]; then
            log_warning "GPU acceleration may not work properly"
        fi
    fi
}

# Build Docker image
build_image() {
    log_info "Building Docker image for Jetson Nano..."
    
    local build_args=""
    if [[ "$ENABLE_TENSORRT" == "true" ]]; then
        build_args="--build-arg ENABLE_TENSORRT=true"
    fi
    
    execute_cmd "cd $EDGE_DIR && docker build -t $IMAGE_NAME --target jetson $build_args ." \
        "Building edge service image"
    
    log_success "Docker image built successfully"
}

# Save and transfer Docker image
transfer_image() {
    log_info "Transferring Docker image to Jetson device..."
    
    local image_file="/tmp/raah-sugam-edge.tar"
    
    # Save Docker image
    execute_cmd "docker save $IMAGE_NAME -o $image_file" \
        "Saving Docker image to file"
    
    # Transfer image file
    execute_cmd "scp_file $image_file /tmp/" \
        "Transferring image file to Jetson"
    
    # Load image on Jetson
    execute_cmd "ssh_cmd 'docker load -i /tmp/raah-sugam-edge.tar'" \
        "Loading Docker image on Jetson"
    
    # Cleanup
    execute_cmd "rm -f $image_file" \
        "Cleaning up local image file"
    
    execute_cmd "ssh_cmd 'rm -f /tmp/raah-sugam-edge.tar'" \
        "Cleaning up remote image file"
    
    log_success "Docker image transferred successfully"
}

# Create environment configuration
create_env_config() {
    log_info "Creating environment configuration..."
    
    local env_file="/tmp/edge.env"
    
    cat > "$env_file" << EOF
# Raah-Sugam Edge Service Configuration
NODE_ENV=$DEPLOY_ENV
LOG_LEVEL=INFO

# Camera Configuration
CAMERA_SOURCE_TYPE=rtsp
CAMERA_RTSP_URL=rtsp://admin:password@192.168.1.100:554/stream1
CAMERA_WIDTH=1280
CAMERA_HEIGHT=720
CAMERA_FPS=30

# YOLO Configuration
YOLO_USE_GPU=$ENABLE_GPU
YOLO_HALF_PRECISION=true
YOLO_TENSORRT_OPTIMIZATION=$ENABLE_TENSORRT
YOLO_CONFIDENCE_THRESHOLD=0.5

# RL Configuration
RL_CONFIDENCE_THRESHOLD=0.7
RL_TRAINING_MODE=false

# Backend Communication
BACKEND_URL=http://192.168.1.1:8080
WEBSOCKET_URL=ws://192.168.1.1:8080/telemetry

# Performance
PROCESSING_TARGET_FPS=10
PROCESSING_FRAME_SKIP=2

# Hardware
USE_GPU=$ENABLE_GPU
ENABLE_TENSORRT=$ENABLE_TENSORRT
CPU_THREADS=4
GPU_MEMORY_LIMIT=2048
EOF
    
    # Transfer environment file
    execute_cmd "scp_file $env_file /home/$JETSON_USER/.env" \
        "Transferring environment configuration"
    
    # Cleanup
    execute_cmd "rm -f $env_file" \
        "Cleaning up local environment file"
    
    log_success "Environment configuration created"
}

# Deploy container
deploy_container() {
    log_info "Deploying container on Jetson device..."
    
    # Stop and remove existing container
    execute_cmd "ssh_cmd 'docker stop $CONTAINER_NAME 2>/dev/null || true'" \
        "Stopping existing container"
    
    execute_cmd "ssh_cmd 'docker rm $CONTAINER_NAME 2>/dev/null || true'" \
        "Removing existing container"
    
    # Prepare docker run command
    local docker_cmd="docker run -d"
    docker_cmd="$docker_cmd --name $CONTAINER_NAME"
    docker_cmd="$docker_cmd --restart unless-stopped"
    docker_cmd="$docker_cmd --env-file /home/$JETSON_USER/.env"
    
    # GPU support
    if [[ "$ENABLE_GPU" == "true" ]]; then
        docker_cmd="$docker_cmd --gpus all"
    fi
    
    # Volume mounts
    docker_cmd="$docker_cmd -v /home/$JETSON_USER/raah-sugam-data:/app/data"
    docker_cmd="$docker_cmd -v /home/$JETSON_USER/raah-sugam-logs:/app/logs"
    
    # Network configuration
    docker_cmd="$docker_cmd --network host"
    
    # Health check
    docker_cmd="$docker_cmd --health-cmd='python3 -c \"import sys; sys.exit(0)\"'"
    docker_cmd="$docker_cmd --health-interval=30s"
    docker_cmd="$docker_cmd --health-timeout=10s"
    docker_cmd="$docker_cmd --health-retries=3"
    
    # Image name
    docker_cmd="$docker_cmd $IMAGE_NAME"
    
    # Create data directories
    execute_cmd "ssh_cmd 'mkdir -p /home/$JETSON_USER/raah-sugam-data /home/$JETSON_USER/raah-sugam-logs'" \
        "Creating data directories"
    
    # Run container
    execute_cmd "ssh_cmd '$docker_cmd'" \
        "Starting edge service container"
    
    log_success "Container deployed successfully"
}

# Setup systemd service (optional)
setup_systemd_service() {
    log_info "Setting up systemd service for auto-start..."
    
    local service_file="/tmp/raah-sugam-edge.service"
    
    cat > "$service_file" << EOF
[Unit]
Description=Raah-Sugam Edge AI Traffic Control Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/docker start $CONTAINER_NAME
ExecStop=/usr/bin/docker stop $CONTAINER_NAME
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
    
    # Transfer service file
    execute_cmd "scp_file $service_file /tmp/" \
        "Transferring systemd service file"
    
    # Install service
    execute_cmd "ssh_cmd 'sudo mv /tmp/raah-sugam-edge.service /etc/systemd/system/'" \
        "Installing systemd service"
    
    execute_cmd "ssh_cmd 'sudo systemctl daemon-reload'" \
        "Reloading systemd daemon"
    
    execute_cmd "ssh_cmd 'sudo systemctl enable raah-sugam-edge'" \
        "Enabling auto-start service"
    
    # Cleanup
    execute_cmd "rm -f $service_file" \
        "Cleaning up local service file"
    
    log_success "Systemd service configured"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Wait for container to start
    sleep 10
    
    # Check container status
    local container_status=$(ssh_cmd "docker ps --filter name=$CONTAINER_NAME --format '{{.Status}}'")
    
    if [[ -n "$container_status" ]]; then
        log_success "Container is running: $container_status"
    else
        log_error "Container is not running"
        log_info "Container logs:"
        ssh_cmd "docker logs $CONTAINER_NAME --tail 50"
        exit 1
    fi
    
    # Check container health
    local health_status=$(ssh_cmd "docker inspect $CONTAINER_NAME --format='{{.State.Health.Status}}' 2>/dev/null || echo 'unknown'")
    log_info "Container health: $health_status"
    
    # Show container logs
    log_info "Recent container logs:"
    ssh_cmd "docker logs $CONTAINER_NAME --tail 20"
    
    log_success "Deployment verification completed"
}

# Cleanup function
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Deployment failed with exit code $exit_code"
    fi
    exit $exit_code
}

# Main deployment function
main() {
    trap cleanup EXIT
    
    echo "========================================"
    echo "🚦 Raah-Sugam Jetson Nano Deployment"
    echo "   AI-Powered Traffic Control System"
    echo "========================================"
    echo ""
    
    parse_args "$@"
    
    log_info "Starting deployment to $JETSON_IP..."
    log_info "Target user: $JETSON_USER"
    log_info "Container name: $CONTAINER_NAME"
    log_info "Image name: $IMAGE_NAME"
    log_info "Environment: $DEPLOY_ENV"
    log_info "GPU enabled: $ENABLE_GPU"
    log_info "TensorRT enabled: $ENABLE_TENSORRT"
    echo ""
    
    validate_prerequisites
    check_jetson_system
    build_image
    transfer_image
    create_env_config
    deploy_container
    setup_systemd_service
    verify_deployment
    
    echo ""
    echo "========================================"
    log_success "Deployment completed successfully!"
    echo "========================================"
    echo ""
    echo "📊 Monitor the service:"
    echo "   docker logs $CONTAINER_NAME -f"
    echo ""
    echo "🔧 Manage the service:"
    echo "   docker stop/start/restart $CONTAINER_NAME"
    echo "   sudo systemctl stop/start/restart raah-sugam-edge"
    echo ""
    echo "🚀 The edge AI service is now running on Jetson Nano"
    echo "   and will automatically start on system boot."
    echo ""
}

# Run main function with all arguments
main "$@"