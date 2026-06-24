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
xcodegen generate

echo "[ci_post_clone] Done. Project regenerated from project.yml."
