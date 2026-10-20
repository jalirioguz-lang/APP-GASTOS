#!/usr/bin/env python3
"""Espera un Supabase local estable y guarda solo variables públicas para pruebas."""
from __future__ import annotations

import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".tmp" / "supabase-local-test.env"
TIMEOUT_SECONDS = 90


def status_env() -> dict[str, str]:
    result = subprocess.run(
        ["npx", "--yes", "supabase@2.73.0", "status", "-o", "env"],
        cwd=ROOT, capture_output=True, text=True, timeout=20, check=False,
    )
    values: dict[str, str] = {}
    for line in result.stdout.splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            values[key] = value.strip().strip('"')
    return values


def ready(values: dict[str, str]) -> bool:
    api_url = values.get("API_URL")
    publishable_key = values.get("PUBLISHABLE_KEY")
    if not api_url or not publishable_key:
        return False
    request = urllib.request.Request(f"{api_url}/rest/v1/", headers={"apikey": publishable_key}, method="HEAD")
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            return response.status in (200, 404)
    except OSError:
        return False


deadline = time.monotonic() + TIMEOUT_SECONDS
while time.monotonic() < deadline:
    try:
        env = status_env()
        if ready(env):
            OUT.parent.mkdir(exist_ok=True)
            OUT.write_text(
                f'NEXT_PUBLIC_SUPABASE_URL="{env["API_URL"]}"\n'
                f'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="{env["PUBLISHABLE_KEY"]}"\n',
                encoding="utf-8",
            )
            print(f"READY Supabase local estable; variables públicas guardadas en {OUT.relative_to(ROOT)}")
            sys.exit(0)
    except (subprocess.SubprocessError, OSError, ValueError):
        pass
    time.sleep(3)

print(f"NOT READY después de {TIMEOUT_SECONDS}s; no se ejecutó la batería de seguridad", file=sys.stderr)
sys.exit(1)
