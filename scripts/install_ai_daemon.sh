#!/bin/bash
# ============================================================================
# Install PalmCare AI Task Daemon as a macOS LaunchAgent
#
# This script:
#   1. Installs required Python packages
#   2. Configures the launchd plist with correct paths
#   3. Installs the plist to ~/Library/LaunchAgents/
#   4. Loads and starts the daemon
#
# Usage:
#   chmod +x scripts/install_ai_daemon.sh
#   ./scripts/install_ai_daemon.sh
#
# To uninstall:
#   ./scripts/install_ai_daemon.sh --uninstall
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DAEMON_DIR="$HOME/.palmcare"
PLIST_NAME="com.palmcare.ai-tasks"
PLIST_DST="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"
LOG_FILE="$HOME/Library/Logs/palmcare-ai-tasks.log"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "================================================"
echo "  PalmCare AI Task Daemon Installer"
echo "================================================"
echo ""

# ------------------------------------------------------------------
# Uninstall
# ------------------------------------------------------------------
if [ "$1" = "--uninstall" ]; then
    echo -e "${YELLOW}Uninstalling AI Task Daemon...${NC}"

    if launchctl list | grep -q "$PLIST_NAME" 2>/dev/null; then
        launchctl unload "$PLIST_DST" 2>/dev/null || true
        echo "  Stopped daemon"
    fi

    if [ -f "$PLIST_DST" ]; then
        rm "$PLIST_DST"
        echo "  Removed plist"
    fi

    echo -e "${GREEN}Uninstalled successfully.${NC}"
    exit 0
fi

# ------------------------------------------------------------------
# Pre-flight checks
# ------------------------------------------------------------------
echo "Checking prerequisites..."

if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${RED}ERROR: .env file not found at $PROJECT_ROOT/.env${NC}"
    echo "  Copy .env.example to .env and fill in RESEND_API_KEY and ANTHROPIC_API_KEY"
    exit 1
fi

if ! grep -q "RESEND_API_KEY=" "$PROJECT_ROOT/.env"; then
    echo -e "${RED}ERROR: RESEND_API_KEY not found in .env${NC}"
    exit 1
fi

if ! grep -q "ANTHROPIC_API_KEY=" "$PROJECT_ROOT/.env"; then
    echo -e "${RED}ERROR: ANTHROPIC_API_KEY not found in .env${NC}"
    exit 1
fi

echo -e "  ${GREEN}✓${NC} .env file found with required keys"

# ------------------------------------------------------------------
# Install Python dependencies
# ------------------------------------------------------------------
echo ""
echo "Installing Python dependencies..."
pip3 install --quiet anthropic requests python-dotenv 2>/dev/null || {
    pip3 install anthropic requests python-dotenv
}
echo -e "  ${GREEN}✓${NC} Python packages installed"

# ------------------------------------------------------------------
# Copy daemon files to ~/.palmcare/ (avoids macOS Desktop sandbox)
# ------------------------------------------------------------------
echo ""
echo "Setting up daemon directory..."

mkdir -p "$DAEMON_DIR"
mkdir -p "$HOME/Library/LaunchAgents"
mkdir -p "$HOME/Library/Logs"

cp "$SCRIPT_DIR/ai_task_daemon.py" "$DAEMON_DIR/"
cp "$SCRIPT_DIR/ai_task_executor.py" "$DAEMON_DIR/"
cp "$PROJECT_ROOT/.env" "$DAEMON_DIR/.env"

# Update PROJECT_ROOT in copied files to point to actual project
sed -i '' "s|PROJECT_ROOT = Path(__file__).resolve().parent.parent|PROJECT_ROOT = Path(\"$PROJECT_ROOT\")|" "$DAEMON_DIR/ai_task_executor.py"
sed -i '' "s|PROJECT_ROOT = Path(__file__).resolve().parent.parent|PROJECT_ROOT = Path(\"$PROJECT_ROOT\")|" "$DAEMON_DIR/ai_task_daemon.py"
sed -i '' "s|load_dotenv(PROJECT_ROOT / \".env\")|load_dotenv(Path.home() / \".palmcare\" / \".env\")|" "$DAEMON_DIR/ai_task_daemon.py"

echo -e "  ${GREEN}✓${NC} Daemon files copied to $DAEMON_DIR"

# ------------------------------------------------------------------
# Configure and install plist
# ------------------------------------------------------------------
echo ""
echo "Configuring LaunchAgent..."

# Stop existing daemon if running
if launchctl list | grep -q "$PLIST_NAME" 2>/dev/null; then
    echo "  Stopping existing daemon..."
    launchctl unload "$PLIST_DST" 2>/dev/null || true
fi

cat > "$PLIST_DST" << PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$PLIST_NAME</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>$DAEMON_DIR/ai_task_daemon.py</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$DAEMON_DIR</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
        <key>PYTHONPATH</key>
        <string>$DAEMON_DIR</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>ThrottleInterval</key>
    <integer>30</integer>
    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/palmcare-ai-tasks.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/palmcare-ai-tasks-error.log</string>
</dict>
</plist>
PLIST_EOF

echo -e "  ${GREEN}✓${NC} Plist installed to $PLIST_DST"

# ------------------------------------------------------------------
# Load and start
# ------------------------------------------------------------------
echo ""
echo "Starting daemon..."
launchctl load "$PLIST_DST"

sleep 2

if launchctl list | grep -q "$PLIST_NAME"; then
    echo -e "  ${GREEN}✓${NC} Daemon is running!"
else
    echo -e "  ${YELLOW}⚠${NC} Daemon may not have started. Check logs:"
    echo "     tail -f $LOG_FILE"
fi

# ------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------
echo ""
echo "================================================"
echo -e "  ${GREEN}Installation complete!${NC}"
echo "================================================"
echo ""
echo "  Inbox:    ai@palmcareai.com"
echo "  Replies:  support@palmtai.com"
echo "  Polling:  every 60 seconds"
echo "  Logs:     $LOG_FILE"
echo ""
echo "  Commands:"
echo "    View logs:     tail -f $LOG_FILE"
echo "    Stop daemon:   launchctl unload $PLIST_DST"
echo "    Start daemon:  launchctl load $PLIST_DST"
echo "    Uninstall:     $0 --uninstall"
echo "    Run once:      python3 $SCRIPT_DIR/ai_task_daemon.py --once"
echo ""
echo "  Send an email to ai@palmcareai.com to test!"
echo ""
