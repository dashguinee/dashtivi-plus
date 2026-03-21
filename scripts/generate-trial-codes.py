#!/usr/bin/env python3
"""
Generate trial access codes for DashTivi+ and insert into Supabase.

Usage:
  python3 scripts/generate-trial-codes.py --count 100
  python3 scripts/generate-trial-codes.py              # default: 100 codes

Each code grants 48-hour trial access to the shared Xtream test account.
Format: FREE-XXXX (4 random uppercase alphanumeric chars)
"""

import argparse
import json
import random
import string
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

# ── Config ────────────────────────────────────────────────────────
SUPABASE_URL = "https://mclbbkmpovnvcfmwsoqt.supabase.co/rest/v1"
TABLE = "tivi_access_codes"
XTREAM_USER = "Test032026"
XTREAM_PASS = "032026Test"
TIER = "TRIAL"
MAX_STREAMS = 1
TRIAL_HOURS = 48
BATCH_SIZE = 50  # Supabase REST batch insert limit


def load_service_key() -> str:
    """Load Supabase SERVICE_KEY from zion-interface .env or Hub .env."""
    search_paths = [
        Path.home() / "zion-interface" / ".env",
        Path.home() / "Hub" / ".env",
    ]
    for env_path in search_paths:
        if not env_path.exists():
            continue
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            if key.strip() == "SUPABASE_SERVICE_KEY":
                return value.strip()
    print("ERROR: SUPABASE_SERVICE_KEY not found in .env files", file=sys.stderr)
    sys.exit(1)


def generate_code() -> str:
    """Generate a trial code like FREE-A1B2."""
    chars = string.ascii_uppercase + string.digits
    suffix = "".join(random.choices(chars, k=4))
    return f"FREE-{suffix}"


def generate_unique_codes(count: int) -> list[str]:
    """Generate `count` unique trial codes."""
    codes = set()
    attempts = 0
    max_attempts = count * 10
    while len(codes) < count and attempts < max_attempts:
        codes.add(generate_code())
        attempts += 1
    if len(codes) < count:
        print(f"WARNING: only generated {len(codes)} unique codes out of {count} requested", file=sys.stderr)
    return sorted(codes)


def insert_codes(codes: list[str], service_key: str) -> int:
    """Insert codes into Supabase in batches. Returns number successfully inserted."""
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=TRIAL_HOURS)).isoformat()
    total_inserted = 0

    for i in range(0, len(codes), BATCH_SIZE):
        batch = codes[i : i + BATCH_SIZE]
        rows = [
            {
                "code": code,
                "user_xtream": XTREAM_USER,
                "pass_xtream": XTREAM_PASS,
                "tier": TIER,
                "expires_at": expires_at,
                "max_streams": MAX_STREAMS,
                "is_active": True,
                "label": "Trial (48h free)",
                "customer_name": None,
            }
            for code in batch
        ]

        body = json.dumps(rows).encode("utf-8")
        req = Request(
            f"{SUPABASE_URL}/{TABLE}",
            data=body,
            headers={
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            method="POST",
        )

        try:
            urlopen(req)
            total_inserted += len(batch)
            print(f"  Inserted batch {i // BATCH_SIZE + 1} ({len(batch)} codes)", file=sys.stderr)
        except HTTPError as e:
            error_body = e.read().decode("utf-8", errors="replace")
            print(f"  ERROR inserting batch {i // BATCH_SIZE + 1}: {e.code} — {error_body}", file=sys.stderr)
        except URLError as e:
            print(f"  ERROR inserting batch {i // BATCH_SIZE + 1}: {e.reason}", file=sys.stderr)

    return total_inserted


def main():
    parser = argparse.ArgumentParser(description="Generate DashTivi+ trial access codes")
    parser.add_argument("--count", type=int, default=100, help="Number of trial codes to generate (default: 100)")
    args = parser.parse_args()

    if args.count < 1:
        print("ERROR: --count must be at least 1", file=sys.stderr)
        sys.exit(1)

    print(f"Generating {args.count} trial codes...", file=sys.stderr)

    service_key = load_service_key()
    codes = generate_unique_codes(args.count)

    print(f"Inserting {len(codes)} codes into Supabase...", file=sys.stderr)
    inserted = insert_codes(codes, service_key)

    print(f"\nDone: {inserted}/{len(codes)} codes inserted successfully.\n", file=sys.stderr)

    # Output codes to stdout (one per line) for easy piping/saving
    for code in codes:
        print(code)


if __name__ == "__main__":
    main()
