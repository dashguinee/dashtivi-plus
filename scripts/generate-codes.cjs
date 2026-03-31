#!/usr/bin/env node
/**
 * DashTivi+ Access Code Generator
 *
 * Reads DASH-Base subscribers (VIP, RELIABLE, AT_RISK, OK, OK-Mars, OK-Fevrier)
 * and generates DASH-SL-XXXX premium access codes for those without existing codes.
 *
 * Usage:
 *   node scripts/generate-codes.cjs                    # Dry run (preview)
 *   node scripts/generate-codes.cjs --execute          # Actually insert codes
 *   node scripts/generate-codes.cjs --execute --json   # Insert + output JSON
 *
 * Xtream credentials: Test032526/032526Test (expires July 17, longest runway)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Config ────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://mclbbkmpovnvcfmwsoqt.supabase.co/rest/v1';
const XTREAM_USER = 'Test032526';
const XTREAM_PASS = '032526Test';
const TIER = 'PREMIUM';
const MAX_STREAMS = 1;
const EXPIRY_DAYS = 90;
const CODE_PREFIX = 'DASH-SL-';

// Segments that qualify as DASH-Base customers
const CUSTOMER_STATUSES = ['OK', 'OK-Mars', 'OK-Fevrier', 'ACTIVE'];
const CUSTOMER_SEGMENTS = ['VIP', 'RELIABLE', 'AT_RISK', 'ACTIVE'];

// ── Load Service Key ──────────────────────────────────────────────
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
      if (key.trim() === 'SUPABASE_SERVICE_KEY') {
        return rest.join('=').trim();
      }
    }
  }

  console.error('ERROR: SUPABASE_SERVICE_KEY not found in .env files');
  process.exit(1);
}

// ── Supabase REST Helper ──────────────────────────────────────────
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
        'Prefer': method === 'POST' ? 'return=representation' : 'return=representation',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Generate Unique Code ──────────────────────────────────────────
function generateCode(existingCodes) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let attempts = 0;
  do {
    const suffix = Array.from(crypto.randomBytes(4))
      .map(b => chars[b % chars.length])
      .join('');
    code = `${CODE_PREFIX}${suffix}`;
    attempts++;
  } while (existingCodes.has(code) && attempts < 1000);

  existingCodes.add(code);
  return code;
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const jsonOutput = args.includes('--json');

  const serviceKey = loadServiceKey();

  // Step 1: Get all DASH-Base customers (VIP + RELIABLE + AT_RISK + OK statuses)
  console.error('Fetching DASH-Base subscribers...');
  const subsResult = await supabaseRequest(
    'GET',
    `subscribers?select=name,phone,status,segment,core_id&status=in.(${CUSTOMER_STATUSES.join(',')})&order=segment,name`,
    null,
    serviceKey
  );

  if (subsResult.status !== 200) {
    console.error('ERROR fetching subscribers:', subsResult.data);
    process.exit(1);
  }

  // Also get AT_RISK with DU status (they're still customers)
  const atRiskResult = await supabaseRequest(
    'GET',
    'subscribers?select=name,phone,status,segment,core_id&segment=eq.AT_RISK&status=eq.DU&order=name',
    null,
    serviceKey
  );

  let allCustomers = [...subsResult.data];
  if (atRiskResult.status === 200) {
    allCustomers = allCustomers.concat(atRiskResult.data);
  }

  // Deduplicate by core_id (some customers appear twice with same core_id)
  const seenCoreIds = new Set();
  const seenPhones = new Set();
  const uniqueCustomers = [];

  for (const sub of allCustomers) {
    // Skip DIOP DASH (that's you) and placeholder customers
    if (sub.core_id === '0000') continue;
    if (sub.name && sub.name.startsWith('SL Customer')) continue;

    // Deduplicate by core_id
    const dedupeKey = sub.core_id || sub.phone || sub.name;
    if (seenCoreIds.has(dedupeKey)) continue;
    seenCoreIds.add(dedupeKey);

    // Also deduplicate by phone
    if (sub.phone && seenPhones.has(sub.phone)) continue;
    if (sub.phone) seenPhones.add(sub.phone);

    uniqueCustomers.push(sub);
  }

  console.error(`Found ${uniqueCustomers.length} unique DASH-Base customers`);

  // Step 2: Get existing codes to avoid duplicates
  console.error('Fetching existing access codes...');
  const codesResult = await supabaseRequest(
    'GET',
    'tivi_access_codes?select=code,customer_name,core_id,is_active',
    null,
    serviceKey
  );

  if (codesResult.status !== 200) {
    console.error('ERROR fetching codes:', codesResult.data);
    process.exit(1);
  }

  const existingCodes = new Set(codesResult.data.map(c => c.code));
  const existingCoreIds = new Set(
    codesResult.data
      .filter(c => c.core_id && c.is_active)
      .map(c => c.core_id)
  );
  const existingNames = new Set(
    codesResult.data
      .filter(c => c.customer_name && c.is_active)
      .map(c => c.customer_name.toLowerCase())
  );

  console.error(`Existing codes: ${existingCodes.size} total, ${existingCoreIds.size} active with core_id`);

  // Step 3: Generate codes for customers without one
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const newCodes = [];
  const skipped = [];

  for (const customer of uniqueCustomers) {
    // Check if customer already has an active code
    const hasCodeByCoreId = customer.core_id && existingCoreIds.has(customer.core_id);
    const hasCodeByName = customer.name && existingNames.has(customer.name.toLowerCase());

    if (hasCodeByCoreId || hasCodeByName) {
      skipped.push({ name: customer.name, reason: 'already has active code' });
      continue;
    }

    // Skip if no phone (can't deliver)
    if (!customer.phone || customer.phone.length < 5) {
      skipped.push({ name: customer.name, reason: 'no phone number' });
      continue;
    }

    const code = generateCode(existingCodes);

    newCodes.push({
      code,
      user_xtream: XTREAM_USER,
      pass_xtream: XTREAM_PASS,
      tier: TIER,
      expires_at: expiresAt,
      max_streams: MAX_STREAMS,
      is_active: true,
      label: `DASH-Base ${customer.segment} customer`,
      core_id: customer.core_id || null,
      customer_name: customer.name,
      customer_phone: customer.phone,
    });
  }

  console.error(`\n=== GENERATION SUMMARY ===`);
  console.error(`Customers found: ${uniqueCustomers.length}`);
  console.error(`Codes to generate: ${newCodes.length}`);
  console.error(`Skipped: ${skipped.length}`);

  if (skipped.length > 0) {
    console.error(`\nSkipped details:`);
    for (const s of skipped) {
      console.error(`  ${s.name}: ${s.reason}`);
    }
  }

  console.error(`\nNew codes to create:`);
  for (const c of newCodes) {
    console.error(`  ${c.code} → ${c.customer_name} (${c.customer_phone}) [${c.tier}, expires ${c.expires_at.split('T')[0]}]`);
  }

  // Step 4: Insert if --execute
  if (execute && newCodes.length > 0) {
    console.error(`\nInserting ${newCodes.length} codes into Supabase...`);

    // Batch insert (max 50 at a time)
    const BATCH_SIZE = 50;
    let totalInserted = 0;

    for (let i = 0; i < newCodes.length; i += BATCH_SIZE) {
      const batch = newCodes.slice(i, i + BATCH_SIZE);
      const result = await supabaseRequest('POST', 'tivi_access_codes', batch, serviceKey);

      if (result.status === 201 || result.status === 200) {
        totalInserted += batch.length;
        console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} codes inserted`);
      } else {
        console.error(`  ERROR batch ${Math.floor(i / BATCH_SIZE) + 1}: ${JSON.stringify(result.data)}`);
      }
    }

    console.error(`\nDone: ${totalInserted}/${newCodes.length} codes inserted successfully.`);
  } else if (!execute) {
    console.error(`\n[DRY RUN] Use --execute to actually insert these codes.`);
  }

  // Output
  const output = newCodes.map(c => ({
    code: c.code,
    customer_name: c.customer_name,
    customer_phone: c.customer_phone,
    tier: c.tier,
    expires: c.expires_at.split('T')[0],
    link: 'https://tivi.dasuperhub.com',
    segment: c.label,
  }));

  if (jsonOutput) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    // CSV output
    console.log('customer_name,code,phone,tier,expires,link');
    for (const o of output) {
      console.log(`${o.customer_name},${o.code},${o.customer_phone},${o.tier},${o.expires},${o.link}`);
    }
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
