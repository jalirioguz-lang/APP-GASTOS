"""Exercise ten fictional companies in separate Chromium browser profiles.

This tests the navigable prototype, not server-side tenant isolation or OCR.
Run with ALDIA_BASE_URL (defaults to the private loopback preview). A JSON
report is written to ALDIA_ARTIFACTS_DIR (defaults to /artifacts).
"""

from __future__ import annotations

import csv
import io
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = os.environ.get("ALDIA_BASE_URL", "http://127.0.0.1:8088/")
ARTIFACTS = Path(os.environ.get("ALDIA_ARTIFACTS_DIR", "/artifacts"))
STORAGE_KEY = "aldia-prototype-v2"

CASES = [
    {"company": "Demo 01 · Cafetería Nube Verde", "sector": "Cafetería", "operator": "Camila Prueba", "project": "Punto central", "budget": 100000, "expense": "Insumos de desayuno", "vendor": "Proveedor ficticio 01", "amount": 45000, "currency": "COP", "category": "Alimentación", "account": "Caja menor", "fund": 20000},
    {"company": "Demo 02 · Taller Rueda Clara", "sector": "Taller", "operator": "Daniel Ensayo", "project": "Servicio móvil", "budget": 300000, "expense": "Repuestos de prueba", "vendor": "Proveedor ficticio 02", "amount": 325000, "currency": "COP", "category": "Operación", "account": "Banco principal"},
    {"company": "Demo 03 · Estudio Farol", "sector": "Diseño", "operator": "Elena Muestra", "project": "Campaña inicial", "budget": 500000, "expense": "Licencia digital USD", "vendor": "Proveedor ficticio 03", "amount": 50, "currency": "USD", "rate": 4050, "category": "Tecnología", "account": "Banco principal"},
    {"company": "Demo 04 · Panadería Trigal Azul", "sector": "Panadería", "operator": "Fabio Prueba", "project": "Horno piloto", "budget": 250000, "expense": "Mantenimiento de horno", "vendor": "Proveedor ficticio 04", "amount": 98000, "currency": "COP", "category": "Servicios", "account": "Banco principal"},
    {"company": "Demo 05 · Huerta Monte Claro", "sector": "Agricultura", "operator": "Gloria Ensayo", "project": "Entrega semanal", "budget": 220000, "expense": "Transporte de cosecha", "vendor": "Proveedor ficticio 05", "amount": 75000, "currency": "COP", "category": "Transporte", "account": "Caja menor", "fund": 100000},
    {"company": "Demo 06 · Muebles Arrayán", "sector": "Carpintería", "operator": "Hugo Muestra", "project": "Sala modelo", "budget": 400000, "expense": "Herramienta EUR", "vendor": "Proveedor ficticio 06", "amount": 40, "currency": "EUR", "rate": 4500, "category": "Operación", "account": "Banco principal"},
    {"company": "Demo 07 · Veterinaria Nube", "sector": "Veterinaria", "operator": "Iris Prueba", "project": "Consultorio", "budget": 270000, "expense": "Servicio de aseo", "vendor": "Proveedor ficticio 07", "amount": 130000, "currency": "COP", "category": "Servicios", "account": "Banco principal"},
    {"company": "Demo 08 · Librería Terral", "sector": "Librería", "operator": "Julián Ensayo", "project": "Catálogo digital", "budget": 190000, "expense": "Software de inventario", "vendor": "Proveedor ficticio 08", "amount": 56000, "currency": "COP", "category": "Tecnología", "account": "Banco principal"},
    {"company": "Demo 09 · Mensajería Río", "sector": "Mensajería", "operator": "Karen Muestra", "project": "Ruta norte", "budget": 200000, "expense": "Combustible de ruta", "vendor": "Proveedor ficticio 09", "amount": 165000, "currency": "COP", "category": "Transporte", "account": "Caja menor", "fund": 150000},
    {"company": "Demo 10 · Confecciones Brisa", "sector": "Confección", "operator": "Luis Prueba", "project": "Colección piloto", "budget": 120000, "expense": "Alimentación jornada", "vendor": "Proveedor ficticio 10", "amount": 39000, "currency": "COP", "category": "Alimentación", "account": "Banco principal"},
]


def action(page, name: str) -> None:
    page.locator(f'[data-action="{name}"]').last.click()


def navigate(page, name: str) -> None:
    page.locator(f'.sidebar [data-view="{name}"]').click()


def state(page) -> dict:
    return page.evaluate("key => JSON.parse(localStorage.getItem(key))", STORAGE_KEY)


def export_rows(page) -> list[list[str]]:
    with page.expect_download() as download_info:
        action(page, "export")
    data = Path(download_info.value.path()).read_bytes().decode("utf-8-sig")
    return list(csv.reader(io.StringIO(data), delimiter=";"))


def test_case(browser, case: dict, previous_expense: str | None) -> dict:
    context = browser.new_context(viewport={"width": 1280, "height": 800}, locale="es-CO", accept_downloads=True)
    page = context.new_page()
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    response = page.goto(BASE_URL, wait_until="networkidle")
    assert response is not None and response.status == 200, f"HTTP inicial: {response.status if response else 'sin respuesta'}"
    assert page.locator("#company-name").is_visible(), "No apareció el alta ficticia"
    assert state(page) is None, "El perfil nuevo ya tenía datos locales"
    if previous_expense:
        assert previous_expense not in page.locator("body").inner_text(), "Un perfil nuevo mostró gastos de otra empresa"

    page.locator("#company-name").fill(case["company"])
    page.get_by_role("button", name="Crear espacio de prueba").click()
    initial = state(page)
    assert initial["company"] == case["company"] and initial["expenses"] == []
    assert initial["budgets"]["total"] == 0

    navigate(page, "projects")
    action(page, "new-project")
    page.locator("#project-name").fill(case["project"])
    action(page, "save-project")
    assert case["project"] in state(page)["projects"]

    navigate(page, "budgets")
    action(page, "edit-budget")
    page.locator("#budget-total").fill(str(case["budget"]))
    action(page, "save-budget")
    assert state(page)["budgets"]["total"] == case["budget"]

    if "fund" in case:
        navigate(page, "petty")
        action(page, "edit-fund")
        page.locator("#fund-balance").fill(str(case["fund"]))
        page.locator("#fund-reason").fill("Apertura ficticia para ensayo")
        action(page, "save-fund")
        assert state(page)["fund"]["balance"] == case["fund"]

    navigate(page, "expenses")
    action(page, "new-expense")
    if case is CASES[0]:
        page.locator("#expense-file").set_input_files({"name": "recibo-ficticio.jpg", "mimeType": "image/jpeg", "buffer": b"foto-ficticia-sin-datos"})
        assert page.locator("#expense-title").input_value() == "", "La foto alteró el título inesperadamente"
        assert state(page)["expenses"] == [], "La foto creó un gasto sin OCR declarado"

    page.locator("#expense-title").fill(case["expense"])
    page.locator("#expense-amount").fill(str(case["amount"]))
    page.locator("#expense-vendor").fill(case["vendor"])
    page.locator("#expense-project").select_option(case["project"])
    page.locator("#expense-category").select_option(case["category"])
    page.locator("#expense-account").select_option(case["account"])
    if case["currency"] != "COP":
        page.locator("#expense-currency").select_option(case["currency"])
        page.locator("#expense-rate").fill(str(case["rate"]))
        page.locator("#rate-reason").fill("Tasa ficticia para ensayo")
    action(page, "save-draft")
    draft = state(page)["expenses"]
    assert len(draft) == 1 and draft[0]["status"] == "draft"
    if case is CASES[0]:
        assert draft[0]["attachmentName"] == "recibo-ficticio.jpg"
    navigate(page, "reports")
    assert len(export_rows(page)) == 1, "Un borrador apareció en el CSV"
    assert page.locator(".grid-four .metric").first.locator(".value").inner_text().strip() == "0"

    navigate(page, "expenses")
    page.locator(".data-table tr", has_text=case["expense"]).locator('[data-action="view-expense"]').click()
    action(page, "edit-draft")
    action(page, "review-form")
    action(page, "confirm-expense")
    saved = state(page)
    expected_cop = round(case["amount"] * case.get("rate", 1))
    assert len(saved["expenses"]) == 1, "Se duplicó el gasto al confirmar"
    expense = saved["expenses"][0]
    assert expense["status"] == "confirmed" and expense["amountCop"] == expected_cop
    assert expense["project"] == case["project"] and expense["account"] == case["account"]
    assert page.locator(".data-table tr", has_text=case["expense"]).get_by_text("Confirmado").is_visible()

    navigate(page, "reports")
    rows = export_rows(page)
    assert len(rows) == 2 and rows[1][2] == case["expense"], "El CSV no contiene exactamente el gasto confirmado"
    assert rows[1][14] == str(expected_cop) and rows[1][15] == "Confirmado"
    page.reload(wait_until="networkidle")
    assert state(page)["company"] == case["company"], "No persistió la empresa en el mismo navegador"
    assert len(state(page)["expenses"]) == 1, "No persistió el gasto tras recargar"
    navigate(page, "budgets")
    assert state(page)["budgets"]["total"] == case["budget"]
    negative_cash = False
    if "fund" in case:
        navigate(page, "petty")
        negative_cash = case["fund"] - expected_cop < 0
        assert (state(page)["fund"]["balance"] - expected_cop < 0) == negative_cash
        if negative_cash:
            assert "-" in page.locator(".fund-balance strong").inner_text(), "El saldo negativo no es visible"

    # This deliberately demonstrates the prototype's lack of company isolation
    # inside a reused browser profile; it is not a pass for real multitenancy.
    if case is CASES[0]:
        navigate(page, "settings")
        action(page, "edit-company")
        page.locator("#edit-company").fill("Demo de otra empresa en el mismo navegador")
        action(page, "save-company")
        assert state(page)["expenses"][0]["title"] == case["expense"], "La demo cambió a otra empresa real"

    assert not errors, f"Errores JavaScript: {errors}"
    result = {"company": case["company"], "sector": case["sector"], "operator_fictitious": case["operator"], "project": case["project"], "budget_cop": case["budget"], "expense": case["expense"], "amount_original": case["amount"], "currency": case["currency"], "amount_cop": expected_cop, "csv_confirmed_rows": len(rows) - 1, "negative_cash": negative_cash, "status": "PASS"}
    context.close()
    return result


def run() -> None:
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    results: list[dict] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for case in CASES:
            try:
                result = test_case(browser, case, results[-1]["expense"] if results else None)
                results.append(result)
                print(f"PASS {result['company']}: {result['amount_cop']} COP, CSV {result['csv_confirmed_rows']} gasto")
            except Exception as error:
                results.append({"company": case["company"], "status": "FAIL", "error": str(error)})
                print(f"FAIL {case['company']}: {error}")
        browser.close()
    report = {"base_url": BASE_URL, "synthetic_only": True, "scenarios": len(CASES), "passed": sum(item["status"] == "PASS" for item in results), "results": results, "known_limitations": ["No hay cuentas ni separación real entre empresas; solo perfiles de navegador independientes.", "La foto no extrae información ni crea un gasto automáticamente.", "El audio es simulado; no se reciben mensajes ni correos.", "El comprobante no se almacena: solo se guarda su nombre."]}
    (ARTIFACTS / "ten_companies_results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    assert report["passed"] == len(CASES), f"Pasaron {report['passed']} de {len(CASES)} escenarios"
    print("OK: diez empresas ficticias en perfiles independientes; no demuestra aislamiento real entre empresas")


if __name__ == "__main__":
    run()
