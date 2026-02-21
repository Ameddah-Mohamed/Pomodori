#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WALLPAPER_DIR="$ROOT_DIR/public/images/wallpapers"
THUMBS_DIR="$WALLPAPER_DIR/thumbs"
MANIFEST="$WALLPAPER_DIR/manifest.json"

THUMB_WIDTH="${THUMB_WIDTH:-320}"
THUMB_HEIGHT="${THUMB_HEIGHT:-180}"
THUMB_QUALITY="${THUMB_QUALITY:-70}"

if ! command -v magick >/dev/null 2>&1; then
  echo "Error: ImageMagick (magick) is required."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required."
  exit 1
fi

if [[ ! -f "$MANIFEST" ]]; then
  echo "Error: Manifest not found at $MANIFEST"
  exit 1
fi

mkdir -p "$THUMBS_DIR"

tmp_manifest="$(mktemp)"
trap 'rm -f "$tmp_manifest"' EXIT

# Start with existing manifest; we append only missing entries.
cp "$MANIFEST" "$tmp_manifest"

shopt -s nullglob
files=("$WALLPAPER_DIR"/back-*.webp)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "No wallpapers matched pattern: $WALLPAPER_DIR/back-*.webp"
  exit 0
fi

added=0
for file in "${files[@]}"; do
  base="$(basename "$file")"
  id="${base%.webp}"
  src="/images/wallpapers/$base"
  thumb="/images/wallpapers/thumbs/$base"
  label="Wallpaper ${id#back-}"

  # Generate thumbnail only if missing.
  if [[ ! -f "$THUMBS_DIR/$base" ]]; then
    magick "$file" \
      -resize "${THUMB_WIDTH}x${THUMB_HEIGHT}^" \
      -gravity center \
      -extent "${THUMB_WIDTH}x${THUMB_HEIGHT}" \
      -quality "$THUMB_QUALITY" \
      "$THUMBS_DIR/$base"
  fi

  # Append only if src is not already present.
  if ! jq -e --arg src "$src" '.[] | select(.src == $src)' "$tmp_manifest" >/dev/null; then
    jq --arg id "$id" --arg src "$src" --arg thumb "$thumb" --arg label "$label" \
      '. + [{"id": $id, "src": $src, "thumb": $thumb, "label": $label}]' \
      "$tmp_manifest" > "$tmp_manifest.next"
    mv "$tmp_manifest.next" "$tmp_manifest"
    added=$((added + 1))
  fi
done

# Keep deterministic order by numeric suffix when possible.
jq '
  sort_by(
    (.id | capture("back-(?<n>[0-9]+)") | .n | tonumber) // 999999
  )
' "$tmp_manifest" > "$MANIFEST"

echo "Done. Added $added new wallpaper entries to manifest."
echo "Manifest: $MANIFEST"
echo "Thumbs:   $THUMBS_DIR"
