#!/bin/sh

# Xcode Cloud runs this immediately after cloning the repo, before resolving
# dependencies or building. We use XcodeGen as the source of truth for the
# project (project.yml). Regenerating here guarantees the .xcodeproj always
# matches the source tree, so a forgotten `xcodegen generate` locally can never
# cause a stale-project build failure again (e.g. a new .swift file that isn't
# wired into the target).

set -e

echo "[ci_post_clone] Installing XcodeGen…"
brew install xcodegen

PROJECT_DIR="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/.." && pwd)}/ios-app"
echo "[ci_post_clone] Regenerating Xcode project in: ${PROJECT_DIR}"
cd "${PROJECT_DIR}"

# Preserve SPM pins — Xcode Cloud builds with automatic resolution disabled
# and requires Package.resolved after GoogleSignIn (and future) packages.
RESOLVED_DIR="PalmCareAI.xcodeproj/project.xcworkspace/xcshareddata/swiftpm"
RESOLVED_FILE="${RESOLVED_DIR}/Package.resolved"
if [ -f "$RESOLVED_FILE" ]; then
  cp "$RESOLVED_FILE" /tmp/Package.resolved.ci.bak
fi

xcodegen generate

# Restore pins if xcodegen recreated the workspace without them.
if [ ! -f "$RESOLVED_FILE" ] && [ -f /tmp/Package.resolved.ci.bak ]; then
  mkdir -p "$RESOLVED_DIR"
  cp /tmp/Package.resolved.ci.bak "$RESOLVED_FILE"
  echo "[ci_post_clone] Restored Package.resolved after xcodegen."
fi

if [ ! -f "$RESOLVED_FILE" ]; then
  echo "[ci_post_clone] ERROR: Package.resolved missing. Commit ios-app/.../swiftpm/Package.resolved."
  exit 1
fi

echo "[ci_post_clone] Done. Project regenerated from project.yml."
