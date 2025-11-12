#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 5 ]; then
  echo "Usage: $0 <repo_url> <commit_sha> <license> <dest_prefix> <file1> [file2 ...]" >&2
  echo "Example: $0 https://github.com/owner/repo.git a1b2c3d MIT reference/ui-reactnative/toast README.md src/index.ts" >&2
  exit 1
fi

REPO_URL="$1"; COMMIT="$2"; LICENSE="$3"; DEST_PREFIX="$4"; shift 4

# איפה נמצאת ספריית הרפרנסים בפועל:
# ברירת מחדל: ./reference ; אם אין – ננסה ../reference ; ואם יש ENV REF_ROOT – נשתמש בו
REF_ROOT="${REF_ROOT:-}"
if [ -z "$REF_ROOT" ]; then
  if [ -d "./reference" ]; then
    REF_ROOT="./reference"
  elif [ -d "../reference" ]; then
    REF_ROOT="../reference"
  else
    echo "ERROR: reference directory not found. Set REF_ROOT env to your reference folder path." >&2
    exit 2
  fi
fi

# תיקיות אינדקס
IDX_DIR="./reference_index"
[ -d "$IDX_DIR" ] || { echo "ERROR: reference_index not found in current project"; exit 3; }

TMP_DIR="$(mktemp -d)"
git clone --depth 1 "$REPO_URL" "$TMP_DIR"
pushd "$TMP_DIR" >/dev/null
git fetch --depth 1 origin "$COMMIT"
git checkout "$COMMIT" >/dev/null 2>&1 || git checkout "$COMMIT"

ADDED_PATHS=()

for SRC in "$@"; do
  if [ ! -f "$SRC" ]; then
    echo "WARN: source path not found in repo: $SRC" >&2
    continue
  fi
  mkdir -p "$OLDPWD/$REF_ROOT/$DEST_PREFIX"
  DEST_FILE="$OLDPWD/$REF_ROOT/$DEST_PREFIX/$(basename "$SRC")"

  # הוספת כותרת ייחוס בקובץ היעד
  {
    echo "/**"
    echo " * Reference snippet from $REPO_URL@$COMMIT, path $SRC. License: $LICENSE."
    echo " * Purpose: <fill-me>. Do not paste wholesale; adapt only the pattern."
    echo " */"
    cat "$SRC"
  } > "$DEST_FILE"

  ADDED_PATHS+=("$DEST_FILE")
  echo "Added: $DEST_FILE"
done

# עדכון רישוי: הוסף את תוכן הרישיון המקורי
popd >/dev/null
if [ -f "$TMP_DIR/LICENSE" ] || [ -f "$TMP_DIR/LICENSE.md" ]; then
  {
    echo -e "\n---"
    echo "# $(basename "$REPO_URL") @ $COMMIT"
    cat "$TMP_DIR"/LICENSE*
  } >> "$IDX_DIR/LICENSE_CAPTURE.md"
fi

# עדכון SOURCES.csv
JOINED_SRC=$(printf "%s|" "$@" | sed 's/|$//')
echo "${REPO_URL#git@}:${COMMIT},${LICENSE},,," >> /dev/null  # no-op placeholder
echo "$REPO_URL,$COMMIT,$LICENSE,,,\"$JOINED_SRC\"" >> "$IDX_DIR/SOURCES.csv"

rm -rf "$TMP_DIR"
