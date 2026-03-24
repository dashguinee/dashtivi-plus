#!/bin/bash
# DashTivi+ Probe Cron Setup
#
# Schedule:
#   Daily 4 AM UTC  — Full deep probe (all channels, double redundancy)
#   Every 72h       — Recheck dead channels (might have come back)
#
# Run this script once to install the cron jobs.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROBE_SCRIPT="$SCRIPT_DIR/deep-probe.cjs"
LOG_DIR="$SCRIPT_DIR/../logs"

mkdir -p "$LOG_DIR"

# Remove existing tivi probe crons
crontab -l 2>/dev/null | grep -v "deep-probe.cjs" > /tmp/crontab_clean

# Add new crons
echo "# DashTivi+ Channel Probes" >> /tmp/crontab_clean
echo "0 4 * * * cd $SCRIPT_DIR/.. && node $PROBE_SCRIPT --upload >> $LOG_DIR/probe-daily.log 2>&1" >> /tmp/crontab_clean
echo "0 4 */3 * * cd $SCRIPT_DIR/.. && node $PROBE_SCRIPT --recheck-dead --upload >> $LOG_DIR/probe-recheck.log 2>&1" >> /tmp/crontab_clean

crontab /tmp/crontab_clean
rm /tmp/crontab_clean

echo "✅ Cron jobs installed:"
echo "   Daily 4 AM UTC  — Full probe"
echo "   Every 72h       — Dead channel recheck"
echo ""
crontab -l | grep "deep-probe"
