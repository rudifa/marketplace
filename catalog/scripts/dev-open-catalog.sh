#!/bin/bash

# File: /Users/rudifarkas/GitHub/js/js-2025/logseq/marketplace/rudifa-logseq-marketplace-table/logseq-marketplace-action/open-catalog.sh

# URL of the raw HTML file
URL="https://raw.githubusercontent.com/rudifa/marketplace/refs/heads/add-package-catalog-generation-3/catalog/index.html"

# Output file name
OUTPUT_DIR=".idea"
OUTPUT_FILE="$OUTPUT_DIR/index.html"

# Create the output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Download the HTML file
curl -s "$URL" > "$OUTPUT_FILE"

# Check if the download was successful
if [ $? -eq 0 ]; then
    echo "Successfully downloaded the catalog."

    # Open the file with the default application
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open "$OUTPUT_FILE"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        xdg-open "$OUTPUT_FILE"
    else
        echo "Unsupported operating system. Please open the file manually."
    fi
else
    echo "Failed to download the catalog."
fi
