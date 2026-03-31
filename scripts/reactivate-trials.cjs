#!/usr/bin/env node
/**
 * Reactivate expired FREE trial codes for the agent distribution programme.
 *
 * Usage:
 *   node scripts/reactivate-trials.cjs              # Dry run
 *   node scripts/reactivate-trials.cjs --execute    # Actually reactivate
 *   node scripts/reactivate-trials.cjs --count 50   # Reactivate 50 (default)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://mclbbkmpovnvcfmwsoqt.supabase.co/rest/v1';
const NEW_EXPIRY = '2026-04-27T00:00:00+00:00'; // 30 days from now

function loadServiceKey() {
  const envPaths = [
    path.join(require('os').homedir(), 'zion-interface', '.env'),
    path.join(require('os').homedir(), 'Hub', '.env'),
  ];
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [key, ...rest] = trimmed.split('=');
      if (key.trim() === 'SUPABASE_SERVICE_KEY') return rest.join('=').trim();
    }
  }
  console.error('ERROR: SUPABASE_SERVICE_KEY not found');
  process.exit(1);
}

function supabaseRequest(method, endpoint, body, serviceKey) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/${endpoint}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const countIdx = args.indexOf('--count');
  const count = countIdx >= 0 ? parseInt(args[countIdx + 1]) : 50;

  const serviceKey = loadServiceKey();

  // Get inactive FREE codes
  console.error(`Fetching up to ${count} inactive FREE trial codes...`);
  const result = await supabaseRequest(
    'GET',
    `tivi_access_codes?select=code,tier,is_active,expires_at&code=like.FREE-*&is_active=eq.false&limit=${count}&order=code`,
    null,
    serviceKey
  );

  if (result.status !== 200 || !Array.isArray(result.data)) {
    console.error('ERROR:', result.data);
    process.exit(1);
  }

  const codes = result.data;
  console.error(`Found ${codes.length} inactive FREE codes`);

  if (!execute) {
    console.error(`[DRY RUN] Would reactivate ${codes.length} codes with expiry ${NEW_EXPIRY}`);
    for (const c of codes.slice(0, 10)) {
      console.error(`  ${c.code} (was expired: ${c.expires_at})`);
    }
    if (codes.length > 10) console.error(`  ... and ${codes.length - 10} more`);
    console.error('\nUse --execute to proceed.');
    return;
  }

  // Patch them
  const codeFilter = codes.map(c => c.code).join(',');
  console.error(`Reactivating ${codes.length} codes...`);

  const patchResult = await supabaseRequest(
    'PATCH',
    `tivi_access_codes?code=in.(${codeFilter})`,
    { is_active: true, expires_at: NEW_EXPIRY, tier: 'TRIAL' },
    serviceKey
  );

  if (patchResult.status === 200 && Array.isArray(patchResult.data)) {
    console.error(`Reactivated: ${patchResult.data.length} trial codes`);
    console.error(`New expiry: ${NEW_EXPIRY.split('T')[0]}`);
    for (const d of patchResult.data.slice(0, 5)) {
      console.error(`  ${d.code} -> active=${d.is_active}, expires=${d.expires_at}`);
    }
    if (patchResult.data.length > 5) {
      console.error(`  ... and ${patchResult.data.length - 5} more`);
    }
    // Output JSON
    console.log(JSON.stringify({ reactivated: patchResult.data.length, expiry: NEW_EXPIRY }, null, 2));
  } else {
    console.error('ERROR:', JSON.stringify(patchResult.data));
    process.exit(1);
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
