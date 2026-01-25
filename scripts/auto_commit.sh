#!/bin/bash
# Auto-commit script for AI Voice Contractor
# Run this periodically (e.g., via cron or launchd) to prevent data loss

cd "$(dirname "$0")/.." || exit 1

# Check if there are any changes
if [[ -n $(git status --porcelain) ]]; then
    timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    
    # Stage all changes
    git add -A
    
    # Create auto-commit with timestamp
    git commit -m "Auto-save: Work in progress ($timestamp)" \
               -m "This is an automated commit to prevent data loss." \
               -m "Files changed: $(git diff --cached --name-only | wc -l | tr -d ' ')"
    
    echo "[$timestamp] Auto-commit successful"
else
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] No changes to commit"
fi
