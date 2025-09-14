#!/bin/bash

# GabayLakbay Docker Deployment Script

echo "🚀 Starting GabayLakbay Translation System..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker is running"

# Function to start services
start_services() {
    echo "🔨 Building and starting services..."
    docker-compose up --build -d
    
    if [ $? -eq 0 ]; then
        echo "✅ Services started successfully!"
        echo ""
        echo "🌐 Application URLs:"
        echo "   Frontend: http://localhost:3000"
        echo "   Backend API: http://localhost:8000"
        echo "   MongoDB: localhost:27017"
        echo ""
        echo "📊 To view logs: docker-compose logs -f"
        echo "🛑 To stop: docker-compose down"
    else
        echo "❌ Failed to start services"
        exit 1
    fi
}

# Function to stop services
stop_services() {
    echo "🛑 Stopping services..."
    docker-compose down
    echo "✅ Services stopped"
}

# Function to show logs
show_logs() {
    echo "📊 Showing logs (Press Ctrl+C to exit)..."
    docker-compose logs -f
}

# Function to clean up
cleanup() {
    echo "🧹 Cleaning up containers and volumes..."
    docker-compose down -v
    docker system prune -f
    echo "✅ Cleanup completed"
}

# Function to show status
show_status() {
    echo "📊 Service Status:"
    docker-compose ps
}

# Main menu
case "${1:-start}" in
    "start")
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        stop_services
        start_services
        ;;
    "logs")
        show_logs
        ;;
    "status")
        show_status
        ;;
    "cleanup")
        cleanup
        ;;
    "help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start    - Build and start all services (default)"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  logs     - Show logs from all services"
        echo "  status   - Show status of all services"
        echo "  cleanup  - Stop services and clean up volumes"
        echo "  help     - Show this help message"
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo "Use '$0 help' to see available commands"
        exit 1
        ;;
esac
