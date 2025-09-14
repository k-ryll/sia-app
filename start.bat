@echo off
REM GabayLakbay Docker Deployment Script for Windows

echo 🚀 Starting GabayLakbay Translation System...

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo ✅ Docker is running

REM Function to start services
if "%1"=="start" goto start_services
if "%1"=="stop" goto stop_services
if "%1"=="restart" goto restart_services
if "%1"=="logs" goto show_logs
if "%1"=="status" goto show_status
if "%1"=="cleanup" goto cleanup
if "%1"=="help" goto show_help
if "%1"=="" goto start_services

echo ❌ Unknown command: %1
echo Use 'start.bat help' to see available commands
pause
exit /b 1

:start_services
echo 🔨 Building and starting services...
docker-compose up --build -d

if %errorlevel% equ 0 (
    echo ✅ Services started successfully!
    echo.
    echo 🌐 Application URLs:
    echo    Frontend: http://localhost:3000
    echo    Backend API: http://localhost:8000
    echo    MongoDB: localhost:27017
    echo.
    echo 📊 To view logs: start.bat logs
    echo 🛑 To stop: start.bat stop
) else (
    echo ❌ Failed to start services
    pause
    exit /b 1
)
goto end

:stop_services
echo 🛑 Stopping services...
docker-compose down
echo ✅ Services stopped
goto end

:restart_services
call :stop_services
call :start_services
goto end

:show_logs
echo 📊 Showing logs (Press Ctrl+C to exit)...
docker-compose logs -f
goto end

:show_status
echo 📊 Service Status:
docker-compose ps
goto end

:cleanup
echo 🧹 Cleaning up containers and volumes...
docker-compose down -v
docker system prune -f
echo ✅ Cleanup completed
goto end

:show_help
echo Usage: start.bat [command]
echo.
echo Commands:
echo   start    - Build and start all services (default)
echo   stop     - Stop all services
echo   restart  - Restart all services
echo   logs     - Show logs from all services
echo   status   - Show status of all services
echo   cleanup  - Stop services and clean up volumes
echo   help     - Show this help message
goto end

:end
pause
