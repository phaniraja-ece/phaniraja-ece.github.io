#!/bin/bash

# Check if a file path was passed as an argument.
if [ -z "$1" ]; then
    echo "Error: No file specified."
    # Use read to simulate 'pause' in a shell environment if run interactively
    # Otherwise, just exit.
    if [ -t 0 ]; then read -p "Press Enter to continue..." ; fi
    exit 1
fi

# Check if the file actually exists.
if [ ! -f "$1" ]; then
    echo "Error: The specified file does not exist."
    if [ -t 0 ]; then read -p "Press Enter to continue..." ; fi
    exit 1
fi

echo "Calculating SHA256 hash for $(basename "$1")..."

SHA256_HASH=""

# Check for 'sha256sum' (common on Linux)
if command -v sha256sum &> /dev/null; then
    # sha256sum output format: HASH FILENAME
    SHA256_HASH=$(sha256sum "$1" | awk '{print $1}')
# Check for 'shasum' (common on macOS)
elif command -v shasum &> /dev/null; then
    # shasum -a 256 output format: HASH  FILENAME
    SHA256_HASH=$(shasum -a 256 "$1" | awk '{print $1}')
else
    echo "Error: Neither 'sha256sum' nor 'shasum' was found."
    if [ -t 0 ]; then read -p "Press Enter to continue..." ; fi
    exit 1
fi

if [ -n "$SHA256_HASH" ]; then
    echo
    echo "SHA256 Hash: ${SHA256_HASH}"
    echo

    # --- Clipboard Copy ---
    CLIP_TOOL=""
    if command -v pbcopy &> /dev/null; then
        CLIP_TOOL="pbcopy" # macOS clipboard
    elif command -v xclip &> /dev/null; then
        CLIP_TOOL="xclip -selection c" # Linux clipboard
    fi

    if [ -n "$CLIP_TOOL" ]; then
        echo "The hash has been copied to your clipboard."
        echo "${SHA256_HASH}" | $CLIP_TOOL
    else
        echo "Note: Could not find a clipboard utility (pbcopy or xclip)."
    fi
    # --- End Clipboard Copy ---

else
    echo "Error: Failed to calculate the SHA256 hash."
fi

# Simulate 'pause' at the end if the script is run in an interactive terminal
if [ -t 0 ]; then read -p "Press Enter to continue..." ; fi
