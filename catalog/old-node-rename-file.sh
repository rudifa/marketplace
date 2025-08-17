#!/usr/bin/env bash

# File: /Users/rudifarkas/GitHub/js/js-2025/logseq/marketplace/catalog/node-rename-file.sh

# Script to rename files under the current directory and update references
# Usage: ./node-rename-file.sh [-d] <old-name> <new-name>
# or:    ./node-rename-file.sh <old-name> <new-name> [-d]

set -u

debug=false

DRY_RUN=false
OLD_NAME=""
NEW_NAME=""

# Function to print usage
print_usage() {
  echo "Usage: $0 [-d] <old-name> <new-name>"
  echo "  or:  $0 <old-name> <new-name> [-d]"
  echo "  -d: Dry run (show what would be done without actually renaming)"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -d|--dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      if [ -z "$OLD_NAME" ]; then
        OLD_NAME="$1"
      elif [ -z "$NEW_NAME" ]; then
        NEW_NAME="$1"
      else
        echo "Error: Too many arguments"
        print_usage
        exit 1
      fi
      shift
      ;;
  esac
done

# Check if both filenames are provided
if [ -z "$OLD_NAME" ] || [ -z "$NEW_NAME" ]; then
  echo "Error: Both old and new filenames are required"
  print_usage
  exit 1
fi

# Find the file recursively
FILE_PATH=$(find . -name "$OLD_NAME" -type f)

# Check if any files were found
if [ -z "$FILE_PATH" ]; then
  echo "Error: No files found matching '$OLD_NAME'"
  exit 1
fi

# Count the number of files found
FILE_COUNT=$(echo "$FILE_PATH" | wc -l)

if [ "$FILE_COUNT" -gt 1 ]; then
  echo "Error: Multiple files found matching '$OLD_NAME'. Please be more specific."
  echo "Files found:"
  echo "$FILE_PATH"
  exit 1
fi

# Function to check if file is in Git repository
is_in_git_repo() {
  git ls-files --error-unmatch "$1" > /dev/null 2>&1
}

# Function to find and replace occurrences of old filename
find_and_replace() {
  local old_name="$1"
  local new_name="$2"
  local files_to_change=$(grep -rl "$old_name" . --include=\*.{js,mjs,ts,yml,json,md})

  if [ -n "$files_to_change" ]; then
    echo "Files that would be modified:"
    echo "$files_to_change"
    echo ""
    echo "Changes that would be made:"
    for file in $files_to_change; do
      echo "In file: $file"
      grep -n "$old_name" "$file"
    done
  else
    echo "No files found containing references to '$old_name'"
  fi
}


# Always rename in the same subdirectory
DIRNAME=$(dirname "$FILE_PATH")
OLD_BASENAME=$(basename "$FILE_PATH")
NEW_PATH="$DIRNAME/$NEW_NAME"


# Always rename in the same subdirectory
DIRNAME_CLEAN=${DIRNAME#./}
debug && echo "[DEBUG] DIRNAME: $DIRNAME"
debug && echo "[DEBUG] DIRNAME_CLEAN: $DIRNAME_CLEAN"
debug && echo "[DEBUG] OLD_BASENAME: $OLD_BASENAME"
debug && echo "[DEBUG] NEW_NAME: $NEW_NAME"

# 1. Rename file (or show what would be done)
debug && echo "[DEBUG] 0. Rename file"

if is_in_git_repo "$FILE_PATH"; then
  if [ "$DRY_RUN" = true ]; then
    echo "Dry run: Would rename file using git mv: $FILE_PATH -> $NEW_PATH"
  else
    git mv "$FILE_PATH" "$NEW_PATH"
    echo "File renamed successfully using git mv: $FILE_PATH -> $NEW_PATH"
  fi
else
  if [ "$DRY_RUN" = true ]; then
    echo "Dry run: Would rename file using mv: $FILE_PATH -> $NEW_PATH"
  else
    mv -i "$FILE_PATH" "$NEW_PATH"
    echo "File renamed successfully using mv: $FILE_PATH -> $NEW_PATH"
  fi
fi


# 2. Update references (or show what would be done) -- always try all patterns
debug && echo "[DEBUG] 1. Searching for: $DIRNAME_CLEAN/$OLD_BASENAME"
files_to_change=$(find . -type f -not -path '*/.git/*' -exec grep -l "$DIRNAME_CLEAN/$OLD_BASENAME" {} +)
for file in $files_to_change; do
  if [ "$DRY_RUN" = true ]; then
    echo "Dry run: Would update references in: $file (with subdirectory)"
  grep -n "$DIRNAME_CLEAN/$OLD_BASENAME" "$file"
  else
    sed -i '' "s|$DIRNAME_CLEAN/$OLD_BASENAME|$DIRNAME_CLEAN/$NEW_NAME|g" "$file"
    echo "Updated references in: $file (with subdirectory)"
  fi
done

PATTERN_DOT="./$DIRNAME_CLEAN/$OLD_BASENAME"
debug && echo "[DEBUG] 2. Searching for: $PATTERN_DOT"
files_to_change=$(find . -type f -not -path '*/.git/*' -exec grep -l "$PATTERN_DOT" {} +)
for file in $files_to_change; do
  if [ "$DRY_RUN" = true ]; then
    echo "Dry run: Would update references in: $file (with ./subdirectory)"
  grep -n "$PATTERN_DOT" "$file"
  else
    sed -i '' "s|$PATTERN_DOT|./$DIRNAME_CLEAN/$NEW_NAME|g" "$file"
    echo "Updated references in: $file (with ./subdirectory)"
  fi
done

PATTERN_DOTBASE="./$OLD_BASENAME"
debug && echo "[DEBUG] 3. Searching for: $PATTERN_DOTBASE"
files_to_change=$(find . -type f -not -path '*/.git/*' -exec grep -l "$PATTERN_DOTBASE" {} +)
for file in $files_to_change; do
  if [ "$DRY_RUN" = true ]; then
    echo "Dry run: Would update references in: $file (with ./base name)"
  grep -n "$PATTERN_DOTBASE" "$file"
  else
    sed -i '' "s|$PATTERN_DOTBASE|./$NEW_NAME|g" "$file"
    echo "Updated references in: $file (with ./base name)"
  fi
done

debug && echo "[DEBUG] 4. Searching for: $OLD_BASENAME"
files_to_change=$(find . -type f -not -path '*/.git/*' -exec grep -l "$OLD_BASENAME" {} +)
for file in $files_to_change; do
  if [ "$DRY_RUN" = true ]; then
    echo "Dry run: Would update references in: $file (base name only)"
  grep -n "$OLD_BASENAME" "$file"
  else
    sed -i '' "s|$OLD_BASENAME|$NEW_NAME|g" "$file"
    echo "Updated references in: $file (base name only)"
  fi
done

debug && echo "[DEBUG] 5. all done"
