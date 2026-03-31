#!/usr/bin/env node
/**
 * DashTivi+ Code Delivery Message Generator
 *
 * Reads all active PREMIUM codes with customer names and generates
 * personalized WhatsApp delivery messages ready to copy-paste.
 *
 * Usage:
 *   node scripts/send-codes.cjs                  # All active premium codes
 *   node scripts/send-codes.cjs --new-only       # Only codes created today
 *   node scripts/send-codes.cjs --json           # Output as JSON
 *   node scripts/send-codes.cjs --segment VIP    # Only VIP customers
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://mclbbkmpovnvcfmwsoqt.supabase.co/rest/v1';

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

  console.error('ERROR: SUPABASE_SERVICE_KEY not found');
  process.exit(1);
}

// ── Supabase REST Helper ──────────────────────────────────────────
function supabaseGet(endpoint, serviceKey) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/${endpoint}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// ── Message Templates ─────────────────────────────────────────────

function getDeliveryMessage(name, code, expiresDate) {
  // Clean name: remove emoji suffixes, core_id prefixes, etc.
  const cleanName = name
    .replace(/\s*[\u26a0\ufe0f\ud83d\udd0a]+\s*$/g, '')  // Remove trailing emoji
    .replace(/\s*\(.*?\)\s*$/g, '')                         // Remove parenthetical
    .split(' ')[0];                                          // First name only

  return `Hey ${cleanName}! \u2705

Your DashTivi+ access code ready:

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
   ${code}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

How to start watching right now:

1. Open your phone browser
2. Go to: tivi.dasuperhub.com
3. Enter the code above
4. Tap "Add to Home Screen" so e dey easy to find

That's it. You go dey live in 2 minutes. \ud83d\udcfa

Your subscription active until ${expiresDate}.

Live TV. Over 9,000 channels. Premier League, Champions League, Nollywood, Hollywood, kids channels... everything. No decoder. No dish. Just your phone.

Any problem at all \u2014 loading, connection, anything \u2014 just message me right here. I dey.

Enjoy! \ud83d\udd25

\u2014 DASH`;
}

function getRecoveryMessage(name, code, expiresDate) {
  const cleanName = name
    .replace(/\s*[\u26a0\ufe0f\ud83d\udd0a]+\s*$/g, '')
    .replace(/\s*\(.*?\)\s*$/g, '')
    .split(' ')[0];

  return `Hey ${cleanName}! \ud83d\udc4b

Long time! DASH get something new for you \u2014 DashTivi+.

Live TV straight to your phone. Over 9,000 channels. Premier League, Champions League, Nollywood, Hollywood, series, kids channels... everything.

No decoder. No satellite dish. Just your phone.

I already set up your access:

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
   ${code}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

\ud83d\udc49 Open: tivi.dasuperhub.com
\ud83d\udc49 Enter the code
\ud83d\udc49 Start watching

Active until ${expiresDate}. This one on DASH \u2014 enjoy it.

Any wahala, just message me. \ud83d\ude4f

\u2014 DASH`;
}

// ── Format Date ───────────────────────────────────────────────────
function formatDate(isoDate) {
  const d = new Date(isoDate);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const newOnly = args.includes('--new-only');
  const jsonOutput = args.includes('--json');
  const segmentFilter = args.includes('--segment') ? args[args.indexOf('--segment') + 1] : null;

  const serviceKey = loadServiceKey();

  // Get all active premium codes with customer names
  console.error('Fetching active premium codes...');
  let endpoint = 'tivi_access_codes?select=code,customer_name,customer_phone,tier,expires_at,label,core_id,created_at&is_active=eq.true&customer_name=not.is.null&order=customer_name';

  if (newOnly) {
    const today = new Date().toISOString().split('T')[0];
    endpoint += `&created_at=gte.${today}T00:00:00`;
  }

  const codes = await supabaseGet(endpoint, serviceKey);

  if (!Array.isArray(codes)) {
    console.error('ERROR:', codes);
    process.exit(1);
  }

  // Filter out test/dev entries
  const deliverableCodes = codes.filter(c => {
    if (c.customer_name === 'Dash (Dev)' || c.customer_name === 'App Test') return false;
    if (c.customer_name && c.customer_name.startsWith('SL Customer')) return false;
    if (!c.customer_phone || c.customer_phone.length < 5) return false;
    if (segmentFilter && c.label && !c.label.includes(segmentFilter)) return false;
    return true;
  });

  console.error(`Found ${deliverableCodes.length} codes ready for delivery`);

  if (jsonOutput) {
    const output = deliverableCodes.map(c => ({
      name: c.customer_name,
      phone: c.customer_phone,
      code: c.code,
      expires: formatDate(c.expires_at),
      message: getDeliveryMessage(c.customer_name, c.code, formatDate(c.expires_at)),
    }));
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Generate copy-paste messages
  let count = 0;
  for (const c of deliverableCodes) {
    const expiresFormatted = formatDate(c.expires_at);

    // Choose template based on segment
    const isRecovery = c.label && (c.label.includes('AT_RISK') || c.label.includes('RECOVERABLE'));
    const message = isRecovery
      ? getRecoveryMessage(c.customer_name, c.code, expiresFormatted)
      : getDeliveryMessage(c.customer_name, c.code, expiresFormatted);

    count++;
    console.log(`\n${'='.repeat(50)}`);
    console.log(`=== ${c.customer_name} ===`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Phone: ${c.customer_phone}`);
    console.log(`Code: ${c.code}`);
    console.log(`Tier: ${c.tier}`);
    console.log(`Expires: ${expiresFormatted}`);
    console.log(`Segment: ${c.label || 'N/A'}`);
    console.log(`---`);
    console.log(`Message:`);
    console.log(``);
    console.log(message);
    console.log(`\n${'─'.repeat(50)}`);
  }

  console.error(`\nGenerated ${count} delivery messages.`);
  console.error(`\nTip: Copy each message and paste into WhatsApp for the listed phone number.`);
  console.error(`For bulk sending via WhatsApp mirror, use: node scripts/send-codes.cjs --json | node send-via-wa.cjs`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
