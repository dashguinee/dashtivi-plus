#!/usr/bin/env node
/** Final report on DashTivi+ access codes */
const https = require('https');
const fs = require('fs');
const path = require('path');

const envPath = path.join(require('os').homedir(), 'zion-interface', '.env');
let SERVICE_KEY;
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const t = line.trim();
  if (t.startsWith('SUPABASE_SERVICE_KEY=')) {
    SERVICE_KEY = t.split('=').slice(1).join('=').trim();
    break;
  }
}

function get(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL('https://mclbbkmpovnvcfmwsoqt.supabase.co/rest/v1/' + endpoint);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY },
    };
    https.get(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve([]); } });
    }).on('error', reject);
  });
}

async function main() {
  const all = await get('tivi_access_codes?select=code,tier,is_active,customer_name,expires_at&order=tier,customer_name');
  const active = all.filter(d => d.is_active);
  const inactive = all.filter(d => !d.is_active);
  const premiumActive = active.filter(d => d.tier === 'PREMIUM');
  const trialActive = active.filter(d => d.tier === 'TRIAL');

  console.log('==============================');
  console.log('  DashTivi+ CODE REPORT');
  console.log('==============================');
  console.log(`Total codes in DB: ${all.length}`);
  console.log(`Active total: ${active.length}`);
  console.log(`  PREMIUM active: ${premiumActive.length}`);
  console.log(`  TRIAL active: ${trialActive.length}`);
  console.log(`Inactive: ${inactive.length}`);
  console.log('');
  console.log('--- Active PREMIUM codes ---');
  for (const d of premiumActive) {
    console.log(`  ${d.code} | ${d.customer_name || 'N/A'} | expires ${d.expires_at ? d.expires_at.split('T')[0] : 'N/A'}`);
  }
  console.log('');
  console.log('--- Active TRIAL codes (first 10) ---');
  for (const d of trialActive.slice(0, 10)) {
    console.log(`  ${d.code} | expires ${d.expires_at ? d.expires_at.split('T')[0] : 'N/A'}`);
  }
  if (trialActive.length > 10) console.log(`  ... and ${trialActive.length - 10} more`);
}

main().catch(console.error);
