#!/usr/bin/env bash
# Submit a new release to the Solana dApp Store via the CLI.
# Use this AFTER your first version has been accepted via the Publisher Portal
# (web UI). The first submission must go through https://publish.solanamobile.com
# because it mints the App NFT — the CLI handles incremental version updates.
#
# Pre-reqs:
#   1. Build a signed APK:
#        eas build --platform android --profile dapp-store
#      Once it finishes, download the .apk locally and put its path below.
#   2. Set the API key (one-shot, e.g. in your shell profile):
#        export DAPP_STORE_API_KEY=<token from publish.solanamobile.com/dashboard/settings/api-keys>
#   3. Have your publisher keypair JSON available — same wallet that submitted v1.
#
set -e

APK_FILE="${1:-./build/stealf-release.apk}"
KEYPAIR="${2:-./publisher-keypair.json}"
WHATS_NEW="${3:-Bug fixes and performance improvements}"

if [ ! -f "$APK_FILE" ]; then
  echo "❌ APK not found: $APK_FILE"
  echo "Usage: $0 <apk-file> <keypair.json> \"<what's new>\""
  exit 1
fi

if [ ! -f "$KEYPAIR" ]; then
  echo "❌ Keypair not found: $KEYPAIR"
  echo "Usage: $0 <apk-file> <keypair.json> \"<what's new>\""
  exit 1
fi

if [ -z "$DAPP_STORE_API_KEY" ]; then
  echo "❌ DAPP_STORE_API_KEY env var is not set."
  echo "Get one at https://publish.solanamobile.com/dashboard/settings/api-keys"
  exit 1
fi

# Install CLI on demand if not already global.
if ! command -v dapp-store >/dev/null 2>&1; then
  echo "Installing @solana-mobile/dapp-store-cli globally..."
  npm install -g @solana-mobile/dapp-store-cli
fi

echo "Submitting $APK_FILE to the dApp Store..."
echo "  what's new: $WHATS_NEW"

dapp-store \
  --apk-file "$APK_FILE" \
  --keypair "$KEYPAIR" \
  --whats-new "$WHATS_NEW"

echo
echo "✅ Submitted. Track review status at https://publish.solanamobile.com"
echo "   Reviews take 3–5 business days."
