#!/usr/bin/env bash
# release-list Spicetify uninstaller
# One-liner: curl -fsSL "https://raw.githubusercontent.com/daviidpaark/release-list/main/uninstall.sh" | bash

set -euo pipefail

if ! command -v spicetify &>/dev/null; then
  echo "Error: spicetify not found in PATH." >&2
  exit 1
fi

CONFIG_PATH="$(spicetify -c 2>/dev/null || true)"
if [[ -n "$CONFIG_PATH" && -f "$CONFIG_PATH" ]]; then
  SPICE_PATH="$(dirname "$CONFIG_PATH")"
else
  SPICE_PATH="${XDG_CONFIG_HOME:-$HOME/.config}/spicetify"
fi

CONFIG_FILE="$SPICE_PATH/config-xpui.ini"
APPS_TO_REMOVE=("release-list")

# ── 1. Remove app folders ────────────────────────────────────────────────────
for app in "${APPS_TO_REMOVE[@]}"; do
  dest="$SPICE_PATH/CustomApps/$app"
  if [[ -d "$dest" ]]; then
    rm -rf "$dest"
    echo "Removed $dest"
  else
    echo "'$app' folder not found, skipping."
  fi
done

# ── 2. Deregister from config-xpui.ini ──────────────────────────────────────
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
  remove_this=false
  for rem in "${APPS_TO_REMOVE[@]}"; do
    if [[ "$t_clean" == "$rem" ]]; then
      remove_this=true
      break
    fi
  done

  if [[ -n "$t_clean" && "$remove_this" == false ]]; then
    CLEAN_APPS+=("$t_clean")
  fi
done

joined_apps="$(IFS='|'; echo "${CLEAN_APPS[*]}")"
spicetify config custom_apps "$joined_apps"
echo "Deregistered apps from config-xpui.ini"

# ── 3. Apply ──────────────────────────────────────────────────────────────────
echo ""
echo "Applying spicetify..."
spicetify apply
echo ""
echo "Done! Restart Spotify if it's already open."
