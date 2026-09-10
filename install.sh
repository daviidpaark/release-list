#!/usr/bin/env bash
# release-list Spicetify installer
# One-liner: curl -fsSL "https://raw.githubusercontent.com/daviidpaark/release-list/main/install.sh" | bash

set -euo pipefail

REPO_BASE_URL="https://raw.githubusercontent.com/daviidpaark/release-list/main"

# ── 1. Verify spicetify is installed ────────────────────────────────────────
if ! command -v spicetify &>/dev/null; then
  echo "Error: spicetify not found in PATH. Install it from https://spicetify.app first." >&2
  exit 1
fi

# Locate spicetify directory
CONFIG_PATH="$(spicetify -c 2>/dev/null || true)"
if [[ -n "$CONFIG_PATH" && -f "$CONFIG_PATH" ]]; then
  SPICE_PATH="$(dirname "$CONFIG_PATH")"
else
  SPICE_PATH="${XDG_CONFIG_HOME:-$HOME/.config}/spicetify"
fi

CONFIG_FILE="$SPICE_PATH/config-xpui.ini"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Error: config-xpui.ini not found at $CONFIG_FILE. Run 'spicetify backup' first." >&2
  exit 1
fi

# Detect if running from a local clone
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd)" || SCRIPT_DIR="."
APPS=("release-list")

# ── 2. Copy/download custom app files ─────────────────────────────────────────
for app in "${APPS[@]}"; do
  dest="$SPICE_PATH/CustomApps/$app"
  src="$SCRIPT_DIR/$app"

  echo "Installing $app..."
  rm -rf "$dest"
  mkdir -p "$dest"

  if [[ -d "$src" ]]; then
    cp -r "$src/." "$dest/"
    echo "  Copied to $dest"
  else
    for file in index.js manifest.json; do
      echo "  Downloading $file..."
      curl -sL "$REPO_BASE_URL/$app/$file" -o "$dest/$file"
    done
    echo "  Downloaded to $dest"
  fi
done

# ── 3. Register apps in config-xpui.ini ──────────────────────────────────────
current_raw=""
if [[ -f "$CONFIG_FILE" ]]; then
  while IFS='=' read -r key val || [[ -n "$key" ]]; do
    key_trimmed="$(echo "$key" | tr -d '[:space:]')"
    if [[ "$key_trimmed" == "custom_apps" ]]; then
      current_raw="$val"
      break
    fi
  done < "$CONFIG_FILE"
fi

CLEAN_APPS=()
IFS='|' read -ra TOKENS <<< "$current_raw"
for t in "${TOKENS[@]}"; do
  t_clean="$(echo "$t" | tr -d '[:space:]')"
  if [[ -n "$t_clean" ]]; then
    CLEAN_APPS+=("$t_clean")
  fi
done

for app in "${APPS[@]}"; do
  already_present=false
  for item in "${CLEAN_APPS[@]}"; do
    if [[ "$item" == "$app" ]]; then
      already_present=true
      break
    fi
  done

  if $already_present; then
    echo "'$app' already registered in config-xpui.ini"
  else
    CLEAN_APPS+=("$app")
    echo "Registered '$app' in config-xpui.ini"
  fi
done

# Join with |
joined_apps="$(IFS='|'; echo "${CLEAN_APPS[*]}")"

# Set custom_apps natively via spicetify CLI
spicetify config custom_apps "$joined_apps"

# ── 4. Apply ──────────────────────────────────────────────────────────────────
echo ""
echo "Applying spicetify..."
spicetify apply
echo ""
echo "Done! Restart Spotify if it's already open."
