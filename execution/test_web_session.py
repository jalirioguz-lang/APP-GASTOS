#!/usr/bin/env python3
"""Recorrido visual y de sesión con datos ficticios contra el stack Supabase local."""
from __future__ import annotations

import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / ".tmp" / "e2e-session"
ARTIFACTS.mkdir(parents=True, exist_ok=True)
base_url = os.environ.get("E2E_BASE_URL", "http://127.0.0.1:3000")
suffix = str(int(time.time()))
email = f"e2e-{suffix}@example.test"
password = "PruebaSegura123!"
org_name = f"Empresa Evidencia {suffix}"

with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    context = browser.new_context(viewport={"width": 1280, "height": 900}, record_video_dir=str(ARTIFACTS / "video"))
    page = context.new_page()
    page.set_default_timeout(8_000)
    page.goto(f"{base_url}/auth/login", wait_until="domcontentloaded")
    page.screenshot(path=str(ARTIFACTS / "01-login.png"), full_page=True)
    page.locator('input[name="fullName"]').fill("Usuario Evidencia")
    page.locator('input[name="phone"]').fill("3001234567")
    page.locator('input[name="email"]').last.fill(email)
    page.locator('input[name="password"][autocomplete="new-password"]').fill(password)
    page.get_by_role("button", name="Crear cuenta y verificar correo").click()
    page.wait_for_url("**/auth/verify-email")
    page.goto(f"{base_url}/onboarding", wait_until="networkidle")
    page.get_by_label("Nombre de la empresa").fill(org_name)
    page.get_by_role("button", name="Crear espacio de trabajo").click()
    page.wait_for_url("**/dashboard")
    page.screenshot(path=str(ARTIFACTS / "02-dashboard-empty.png"), full_page=True)
    receipt = ARTIFACTS / "recibo.jpg"
    receipt.write_bytes(b"imagen-ficticia")
    page.get_by_label("Descripción").fill("Papelería de prueba")
    page.get_by_label("Categoría").fill("Operación")
    page.get_by_label("Valor en COP").fill("15000")
    page.get_by_label("Proveedor").fill("Proveedor ficticio")
    page.get_by_label("Comprobante").set_input_files(str(receipt))
    page.get_by_role("button", name="Guardar borrador").click()
    page.wait_for_url("**/dashboard")
    page.get_by_text("Papelería de prueba").wait_for()
    page.screenshot(path=str(ARTIFACTS / "03-expense-draft.png"), full_page=True)
    page.get_by_role("button", name="Salir").click()
    page.wait_for_url("**/auth/login")
    page.screenshot(path=str(ARTIFACTS / "04-logout.png"), full_page=True)
    page.go_back(wait_until="domcontentloaded")
    page.reload(wait_until="networkidle")
    assert "/auth/login" in page.url and org_name not in page.content(), "Historial y recarga no deben restaurar datos de sesión cerrada"
    page.goto(f"{base_url}/dashboard", wait_until="networkidle")
    assert "/auth/login" in page.url and org_name not in page.content(), "La sesión cerrada no debe exponer el panel"
    page.screenshot(path=str(ARTIFACTS / "05-dashboard-blocked.png"), full_page=True)
    context.close()
    browser.close()

print(f"PASS E2E: alta, gasto con comprobante, historial y logout; artefactos en {ARTIFACTS}")
