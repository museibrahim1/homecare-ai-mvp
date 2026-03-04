#!/bin/bash
# Wrapper script for the AI Task Daemon
# Handles .env loading and runs from the project directory
PROJECT_DIR="/Users/musaibrahim/Desktop/AI Voice Contracter"
cd "$PROJECT_DIR"

# Load .env
set -a
source "$PROJECT_DIR/.env"
set +a

exec /usr/bin/python3 "$PROJECT_DIR/scripts/ai_task_daemon.py"
