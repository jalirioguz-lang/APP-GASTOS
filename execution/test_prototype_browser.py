"""Pruebas reales del prototipo en Chromium (Playwright 1.63.0).

Variables requeridas: ALDIA_BASE_URL, ALDIA_USER, ALDIA_PASSWORD.
Las capturas y el CSV van a ALDIA_ARTIFACTS_DIR (por defecto /artifacts).
"""

import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = os.environ["ALDIA_BASE_URL"]
USERNAME = os.environ["ALDIA_USER"]
PASSWORD = os.environ["ALDIA_PASSWORD"]
ARTIFACTS = Path(os.environ.get("ALDIA_ARTIFACTS_DIR", "/artifacts"))
ARTIFACTS.mkdir(parents=True, exist_ok=True)


def click_action(page, action):
    page.locator(f'[data-action="{action}"]').last.click()


def navigate(page, view):
    page.locator(f'.sidebar [data-view="{view}"]').click()


def run():
    errors = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        desktop = browser.new_context(
            viewport={"width": 1440, "height": 900},
            locale="es-CO",
            accept_downloads=True,
        )
        page = desktop.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        response = page.goto(BASE_URL, wait_until="networkidle")
        assert response.status == 200, f"Inicio: HTTP {response.status}"
        assert page.get_by_role("heading", name="Entrar a la demostración").is_visible()
        page.screenshot(path=str(ARTIFACTS / "acceso-desktop.png"), full_page=True)
        page.locator("#username").fill(USERNAME)
        page.locator("#password").fill("incorrecta")
        page.get_by_role("button", name="Entrar a AlDía APP").click()
        assert page.get_by_text("Usuario o contraseña incorrectos.").is_visible()
        page.locator("#password").fill(PASSWORD)
        page.get_by_role("button", name="Entrar a AlDía APP").click()
        assert page.get_by_role("heading", name="Cada gasto claro. Cada decisión, a tiempo.").is_visible()
        page.screenshot(path=str(ARTIFACTS / "onboarding-desktop.png"), full_page=True)
        click_action(page, "enter-demo")
        assert page.get_by_role("heading", name="Tus gastos, en orden.").is_visible()
        page.screenshot(path=str(ARTIFACTS / "dashboard-desktop.png"), full_page=True)

        navigate(page, "expenses")
        click_action(page, "new-expense")
        assert page.locator(".app-shell").get_attribute("inert") is not None
        assert page.locator("#expense-title").evaluate("el => document.activeElement === el")
        page.locator("#expense-title").fill("Prueba interna COP")
        page.locator("#expense-amount").fill("45000")
        click_action(page, "save-draft")
        assert page.get_by_text("Prueba interna COP").is_visible()
        assert page.get_by_text("Borrador").count() >= 1
        row = page.locator(".data-table tr", has_text="Prueba interna COP")
        row.locator('[data-action="view-expense"]').click()
        click_action(page, "edit-draft")
        click_action(page, "review-form")
        assert page.get_by_role("heading", name="Revisar antes de confirmar").is_visible()
        click_action(page, "confirm-expense")
        assert page.locator(".data-table tr", has_text="Prueba interna COP").get_by_text("Confirmado").is_visible()

        click_action(page, "new-expense")
        page.locator("#expense-title").fill("Taxi USD")
        page.locator("#expense-amount").fill("50")
        page.locator("#expense-currency").select_option("USD")
        page.locator("#expense-rate").fill("4050")
        page.locator("#rate-reason").fill("Tasa de prueba")
        click_action(page, "review-form")
        assert "202.500" in page.locator(".review-total").inner_text()
        click_action(page, "confirm-expense")
        assert page.locator(".data-table tr", has_text="Taxi USD").count() == 1
        page.screenshot(path=str(ARTIFACTS / "expenses-desktop.png"), full_page=True)

        with page.expect_download() as download_info:
            click_action(page, "export")
        download = download_info.value
        assert download.suggested_filename.endswith(".csv")
        download.save_as(str(ARTIFACTS / "gastos-demo.csv"))

        navigate(page, "budgets")
        assert page.get_by_role("heading", name="Presupuestos").is_visible()
        page.screenshot(path=str(ARTIFACTS / "budgets-desktop.png"), full_page=True)

        navigate(page, "projects")
        click_action(page, "new-project")
        page.locator("#project-name").fill("Proyecto de teclado")
        page.locator("#project-name").press("Enter")
        assert page.get_by_text("Proyecto de teclado").is_visible()

        navigate(page, "expenses")
        click_action(page, "new-expense")
        injected_title = '<img src=x onerror=alert(1)>'
        page.locator("#expense-title").fill(injected_title)
        page.locator("#expense-amount").fill("1")
        click_action(page, "review-form")
        click_action(page, "confirm-expense")
        page.locator(".data-table tr", has_text=injected_title).locator('[data-action="view-expense"]').click()
        assert page.locator(".modal-head h2").inner_text() == injected_title
        assert page.locator(".modal-head h2 img").count() == 0
        page.locator(".modal-head .close").focus()
        page.keyboard.press("Shift+Tab")
        assert page.locator(".modal-footer button").evaluate("el => document.activeElement === el")
        page.keyboard.press("Tab")
        assert page.locator(".modal-head .close").evaluate("el => document.activeElement === el")
        click_action(page, "close-modal")

        click_action(page, "new-expense")
        page.locator("#expense-title").fill("Cambio sin guardar")
        page.once("dialog", lambda dialog: dialog.dismiss())
        click_action(page, "close-modal")
        assert page.locator("#expense-title").is_visible()
        page.once("dialog", lambda dialog: dialog.accept())
        click_action(page, "close-modal")
        assert page.locator(".modal").count() == 0

        click_action(page, "new-expense")
        page.locator("#expense-title").fill("Importe subpeso")
        page.locator("#expense-amount").fill("0.01")
        page.locator("#expense-currency").select_option("USD")
        page.locator("#expense-rate").fill("0.000001")
        page.locator("#rate-reason").fill("Prueba de redondeo")
        click_action(page, "review-form")
        assert page.get_by_text("El equivalente del gasto debe ser al menos COP 1.").is_visible()
        assert page.locator("#expense-title").is_visible()
        page.once("dialog", lambda dialog: dialog.accept())
        click_action(page, "close-modal")

        click_action(page, "audio")
        page.get_by_role("heading", name="Revisar gasto por audio").wait_for(state="visible", timeout=3000)
        assert page.get_by_text("No se ha grabado ni transcrito ningún audio.").is_visible()
        click_action(page, "close-modal")

        mobile = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=1,
            is_mobile=True,
            has_touch=True,
            locale="es-CO",
        )
        mobile_page = mobile.new_page()
        mobile_page.on("pageerror", lambda error: errors.append(str(error)))
        mobile_page.goto(BASE_URL, wait_until="networkidle")
        mobile_page.locator("#password").fill(PASSWORD)
        mobile_page.get_by_role("button", name="Entrar a AlDía APP").click()
        mobile_page.locator("#company-name").fill("Empresa de prueba")
        mobile_page.get_by_role("button", name="Crear espacio de prueba").click()
        assert mobile_page.get_by_text("Sin definir").count() >= 1
        assert not mobile_page.get_by_text("0% usado del límite").count()
        mobile_page.screenshot(path=str(ARTIFACTS / "dashboard-mobile.png"), full_page=True)
        assert mobile_page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")

        click_action(mobile_page, "new-expense")
        mobile_page.locator("#expense-title").fill("Gasto sin presupuesto")
        mobile_page.locator("#expense-amount").fill("45000")
        click_action(mobile_page, "review-form")
        click_action(mobile_page, "confirm-expense")
        navigate(mobile_page, "budgets")
        assert mobile_page.get_by_text("Sin definir").count() >= 1
        assert not mobile_page.get_by_text("0%", exact=True).count()
        mobile_page.screenshot(path=str(ARTIFACTS / "budgets-mobile.png"), full_page=True)

        assert not errors, f"Errores JavaScript: {errors}"
        browser.close()
    print("OK: escritorio, móvil, COP, borrador, confirmación, USD, presupuesto vacío, CSV, teclado, descarte, redondeo, HTML escapado, audio simulado y sin errores JS")


if __name__ == "__main__":
    run()
