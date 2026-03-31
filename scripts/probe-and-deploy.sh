#!/bin/bash
# DashTivi+ Daily Probe Wrapper
# Runs deep-probe.cjs then copies results to public/
# Designed to be called by PM2 cron at 4 AM UTC daily.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="/tmp/probe-cron.log"

echo "=== Probe started: $(date -u) ===" >> "$LOG_FILE"

cd "$SCRIPT_DIR"
node deep-probe.cjs 2>&1 | tee -a "$LOG_FILE"

# Copy results to public directory for serving
if [ -f "$SCRIPT_DIR/probe-results.json" ]; then
  cp "$SCRIPT_DIR/probe-results.json" "$SCRIPT_DIR/../public/probe-results.json"
  echo "Results deployed to public/probe-results.json" >> "$LOG_FILE"
else
  echo "WARNING: probe-results.json not found after probe run" >> "$LOG_FILE"
fi

echo "Probe complete: $(date -u)" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"
