#!/usr/bin/env node
/**
 * DASH Ecosystem Health Monitor
 *
 * Checks critical infrastructure every 30 minutes via PM2 cron.
 * Exit 0 = all OK, Exit 1 = critical failure detected.
 *
 * Checks:
 *   1. VPS proxy (stream.zionsynapse.online/health)
 *   2. Supabase responding
 *   3. DashTivi+ production returning 200
 *   4. Email daemon running (PM2 status)
 *   5. Probe data freshness (< 48h)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PM2_BIN = path.join(
  process.env.HOME || '/home/dash',
  '.npm-global/lib/node_modules/pm2/bin/pm2'
);

const PROBE_FILE = path.join(__dirname, 'probe-results.json');
const LOG_FILE = '/tmp/ecosystem-health.log';
const MAX_PROBE_AGE_HOURS = 48;

// ─── HTTP check helper ──────────────────────────────────
function httpCheck(url, timeout = 10000) {
  return new Promise((resolve) => {
    const start = Date.now();
    try {
      const req = https.get(url, { timeout, rejectUnauthorized: false }, (res) => {
        const latency = Date.now() - start;
        // Consume response body to avoid memory leak
        res.on('data', () => {});
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 400,
            status: res.statusCode,
            latency,
          });
        });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, status: 0, latency: Date.now() - start, error: 'timeout' });
      });
      req.on('error', (err) => {
        resolve({ ok: false, status: 0, latency: Date.now() - start, error: err.code || err.message });
      });
    } catch (e) {
      resolve({ ok: false, status: 0, latency: 0, error: e.message });
    }
  });
}

// ─── Individual checks ──────────────────────────────────

async function checkVPS() {
  const res = await httpCheck('https://stream.zionsynapse.online/health');
  return {
    name: 'VPS Proxy',
    ok: res.ok,
    detail: res.ok
      ? `UP (${res.status}, ${res.latency}ms)`
      : `DOWN (${res.error || 'status ' + res.status})`,
    critical: true,
  };
}

async function checkSupabase() {
  // Hit the Supabase REST endpoint (returns 401 without key, but that means it's alive)
  const res = await httpCheck('https://mclbbkmpovnvcfmwsoqt.supabase.co/rest/v1/');
  const alive = res.status > 0 && res.status < 500;
  return {
    name: 'Supabase',
    ok: alive,
    detail: alive
      ? `UP (${res.status}, ${res.latency}ms)`
      : `DOWN (${res.error || 'status ' + res.status})`,
    critical: true,
  };
}

async function checkProduction() {
  const res = await httpCheck('https://dashtivi.dasuperhub.com');
  return {
    name: 'DashTivi+ Prod',
    ok: res.ok,
    detail: res.ok
      ? `UP (${res.status}, ${res.latency}ms)`
      : `DOWN (${res.error || 'status ' + res.status})`,
    critical: false,
  };
}

function checkEmailDaemon() {
  try {
    const output = execSync(`${PM2_BIN} jlist 2>/dev/null`, { encoding: 'utf8' });
    const procs = JSON.parse(output);
    const email = procs.find(p => p.name === 'email-center');
    if (!email) {
      return { name: 'Email Daemon', ok: false, detail: 'NOT FOUND in PM2', critical: false };
    }
    const status = email.pm2_env?.status || 'unknown';
    const uptime = email.pm2_env?.pm_uptime
      ? Math.round((Date.now() - email.pm2_env.pm_uptime) / 60000)
      : 0;
    return {
      name: 'Email Daemon',
      ok: status === 'online',
      detail: status === 'online'
        ? `ONLINE (uptime ${uptime}m, restarts: ${email.pm2_env?.restart_time || 0})`
        : `${status.toUpperCase()}`,
      critical: false,
    };
  } catch (e) {
    return { name: 'Email Daemon', ok: false, detail: `PM2 error: ${e.message}`, critical: false };
  }
}

function checkProbeFreshness() {
  try {
    const stat = fs.statSync(PROBE_FILE);
    const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
    const fresh = ageHours < MAX_PROBE_AGE_HOURS;
    return {
      name: 'Probe Data',
      ok: fresh,
      detail: fresh
        ? `FRESH (${ageHours.toFixed(1)}h old)`
        : `STALE (${ageHours.toFixed(1)}h old, limit ${MAX_PROBE_AGE_HOURS}h)`,
      critical: false,
    };
  } catch {
    return { name: 'Probe Data', ok: false, detail: 'FILE NOT FOUND', critical: false };
  }
}

// ─── Main ───────────────────────────────────────────────
async function main() {
  const timestamp = new Date().toISOString();
  const checks = await Promise.all([
    checkVPS(),
    checkSupabase(),
    checkProduction(),
    Promise.resolve(checkEmailDaemon()),
    Promise.resolve(checkProbeFreshness()),
  ]);

  // Print results
  console.log(`\n  DASH Ecosystem Health — ${timestamp}`);
  console.log('  ' + '─'.repeat(55));

  let hasCriticalFailure = false;
  let hasAnyFailure = false;

  for (const check of checks) {
    const icon = check.ok ? 'OK' : 'FAIL';
    const crit = check.critical ? ' [CRITICAL]' : '';
    console.log(`  ${icon.padEnd(5)} ${check.name.padEnd(18)} ${check.detail}${!check.ok ? crit : ''}`);
    if (!check.ok) {
      hasAnyFailure = true;
      if (check.critical) hasCriticalFailure = true;
    }
  }

  console.log('  ' + '─'.repeat(55));

  const overall = hasCriticalFailure ? 'CRITICAL' : hasAnyFailure ? 'DEGRADED' : 'HEALTHY';
  console.log(`  Overall: ${overall}\n`);

  // Append to log file
  const logLine = `${timestamp} | ${overall} | ${checks.map(c => `${c.name}:${c.ok ? 'OK' : 'FAIL'}`).join(' | ')}`;
  try {
    fs.appendFileSync(LOG_FILE, logLine + '\n');
  } catch {
    // Log file write failure is not critical
  }

  // Exit code: 1 only for critical failures
  process.exit(hasCriticalFailure ? 1 : 0);
}

main().catch((err) => {
  console.error('Health check crashed:', err.message);
  process.exit(1);
});
