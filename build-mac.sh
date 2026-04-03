#!/usr/bin/env bash
# Build and sign/notarize the macOS app.
# Loads credentials from release.env (not committed to git).
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/release.env" ]; then
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/release.env"
  echo "Loaded credentials from release.env"
else
  echo "Warning: release.env not found — signing/notarization may be skipped."
fi

export APPLE_ID
export APPLE_APP_SPECIFIC_PASSWORD
export APPLE_TEAM_ID

ARCH="${1:-both}"

case "$ARCH" in
  x64)
    npm run package:mac:x64
    ;;
  arm64)
    npm run package:mac:arm64
    ;;
  both)
    npm run package:mac
    ;;
  *)
    echo "Usage: $0 [x64|arm64|both]"
    exit 1
    ;;
esac
