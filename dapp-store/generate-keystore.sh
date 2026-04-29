#!/usr/bin/env bash
# Generate a NEW keystore dedicated to the Solana dApp Store. You CANNOT
# reuse the Google Play keystore — the dApp Store requires a distinct
# signing identity. Run this once, then back up `stealf-dappstore.keystore`
# + the credentials you set (password + key alias password) in 1Password.
# Losing them means you can never push an update for Stealf on the dApp
# Store.
set -e

KEYSTORE_FILE="stealf-dappstore.keystore"
ALIAS="stealf-dappstore"

if [ -f "$KEYSTORE_FILE" ]; then
  echo "❌ $KEYSTORE_FILE already exists — refusing to overwrite. Move it aside first."
  exit 1
fi

echo "About to generate $KEYSTORE_FILE with alias '$ALIAS'."
echo "You will be prompted for:"
echo "  - keystore password (write it down)"
echo "  - the same password again"
echo "  - your name + organisation (CN/OU/O/L/ST/C — used in the cert)"
echo "  - alias key password (use the SAME as keystore password to keep things simple)"
echo
read -p "Press Enter to continue, Ctrl+C to abort..."

keytool -genkey -v \
  -keystore "$KEYSTORE_FILE" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

echo
echo "✅ Keystore created: $KEYSTORE_FILE"
echo
echo "NEXT STEPS:"
echo "  1. Back up $KEYSTORE_FILE + both passwords in 1Password (or equivalent)."
echo "  2. Add this folder to .gitignore — DO NOT commit the keystore."
echo "  3. When you run 'eas build --profile dapp-store' for the first time,"
echo "     EAS will ask whether to auto-generate a keystore or upload your own."
echo "     Pick 'upload your own' and provide $KEYSTORE_FILE + password + alias."
echo
echo "Verify the cert:"
echo "  keytool -list -v -keystore $KEYSTORE_FILE -alias $ALIAS"
