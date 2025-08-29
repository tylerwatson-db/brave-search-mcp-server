#!/bin/sh

# Ensure the script exits on any error
set -e

# Check if BRAVE_API_KEY is set
if [ -z "$BRAVE_API_KEY" ]; then
    echo "Error: BRAVE_API_KEY environment variable is required"
    exit 1
fi

# Start the application with proper arguments
exec node dist/index.js \
    --brave-api-key "$BRAVE_API_KEY" \
    --transport "${BRAVE_MCP_TRANSPORT:-http}" \
    --port "${BRAVE_MCP_PORT:-8080}" \
    --host "${BRAVE_MCP_HOST:-0.0.0.0}"
