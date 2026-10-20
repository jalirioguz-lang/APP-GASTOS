"""Ten fictional companies: exercise every available expense-input path.

The current prototype supports manual entry, a *simulated* audio flow, and
manual entry with image/PDF filenames. It does not ingest email/messages or
extract receipt contents. This test intentionally reports those as gaps.
"""

from __future__ import annotations

import csv
import io
import json
import os
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from playwright.sync_api import sync_playwright

from test_ten_companies import CASES, action, navigate, state


BASE_URL = os.environ.get("ALDIA_BASE_URL", "http://127.0.0.1:8088/")
ARTIFACTS = Path(os.environ.get("ALDIA_ARTIFACTS_DIR", "/artifacts"))
EXPORTS = ARTIFACTS / "channel_exports"


def create_project_and_budget(page, case: dict) -> None:
    navigate(page, "projects")
    action(page, "new-project")
    page.locator("#project-name").fill(case["project"])
    action(page, "save-project")
    navigate(page, "budgets")
    action(page, "edit-budget")
    page.locator("#budget-total").fill(str(case["budget"]))
    action(page, "save-budget")


def complete_expense(page, case: dict, title: str, amount: int, *, use_case_currency: bool = False) -> None:
    page.locator("#expense-title").fill(title)
    page.locator("#expense-amount").fill(str(amount))
    page.locator("#expense-vendor").fill("Proveedor ficticio de ensayo")
    page.locator("#expense-project").select_option(case["project"])
    page.locator("#expense-category").select_option(case["category"])
    page.locator("#expense-account").select_option(case["account"])
    if use_case_currency and case["currency"] != "COP":
        page.locator("#expense-currency").select_option(case["currency"])
        page.locator("#expense-rate").fill(str(case["rate"]))
        page.locator("#rate-reason").fill("Tasa ficticia para ensayo")
    action(page, "review-form")
    action(page, "confirm-expense")


def run_company(browser, case: dict, number: int) -> dict:
    context = browser.new_context(viewport={"width": 1280, "height": 800}, locale="es-CO", accept_downloads=True)
    page = context.new_page()
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    response = page.goto(BASE_URL, wait_until="networkidle")
    assert response is not None and response.status == 200
    assert state(page) is None, "El perfil de prueba no estaba vacío"
    page.locator("#company-name").fill(case["company"])
    page.get_by_role("button", name="Crear espacio de prueba").click()
    create_project_and_budget(page, case)

    titles = [case["expense"], f"Audio simulado {number:02d}", f"Foto adjunta {number:02d}", f"PDF adjunto {number:02d}"]

    # 1. Real manual entry, including the USD/EUR cases from the fixture.
    navigate(page, "expenses")
    action(page, "new-expense")
    complete_expense(page, case, titles[0], case["amount"], use_case_currency=True)
    assert len(state(page)["expenses"]) == 1

    # 2. The audio control only loads canned data; no recording/transcription.
    action(page, "audio")
    page.get_by_role("heading", name="Revisar gasto por audio").wait_for(state="visible", timeout=5000)
    assert page.get_by_text("No se ha grabado ni transcrito ningún audio.").is_visible()
    complete_expense(page, case, titles[1], 28500 + number * 1000)
    assert state(page)["expenses"][-1]["source"] == "audio-demo"

    # 3. An attached image does not extract fields or create an expense.
    action(page, "new-expense")
    image_name = f"recibo-ficticio-{number:02d}.jpg"
    page.locator("#expense-file").set_input_files({"name": image_name, "mimeType": "image/jpeg", "buffer": b"\xff\xd8\xff\xd9"})
    assert page.locator("#expense-title").input_value() == ""
    assert len(state(page)["expenses"]) == 2, "La foto creó un gasto inesperadamente"
    complete_expense(page, case, titles[2], 32000 + number * 1000)
    assert state(page)["expenses"][-1]["attachmentName"] == image_name

    # 4. PDF is likewise only an attachment filename in the prototype.
    action(page, "new-expense")
    pdf_name = f"factura-ficticia-{number:02d}.pdf"
    page.locator("#expense-file").set_input_files({"name": pdf_name, "mimeType": "application/pdf", "buffer": b"%PDF-1.4\n%%EOF\n"})
    assert page.locator("#expense-title").input_value() == ""
    assert len(state(page)["expenses"]) == 3, "El PDF creó un gasto inesperadamente"
    complete_expense(page, case, titles[3], 44000 + number * 1000)
    assert state(page)["expenses"][-1]["attachmentName"] == pdf_name

    saved = state(page)
    assert len(saved["expenses"]) == 4
    assert all(item["status"] == "confirmed" for item in saved["expenses"])
    assert [item["title"] for item in saved["expenses"]] == titles
    assert [item["source"] for item in saved["expenses"]] == ["manual", "audio-demo", "manual", "manual"]
    page.reload(wait_until="networkidle")
    assert len(state(page)["expenses"]) == 4, "Los gastos no persistieron en el mismo navegador"

    navigate(page, "reports")
    with page.expect_download() as download_info:
        action(page, "export")
    download = download_info.value
    assert case["company"].split("·", 1)[0].strip().lower().replace(" ", "-") in download.suggested_filename
    path = EXPORTS / download.suggested_filename
    download.save_as(path)
    rows = list(csv.reader(io.StringIO(path.read_bytes().decode("utf-8-sig")), delimiter=";"))
    assert len(rows) == 5, f"CSV con {len(rows) - 1} gastos, se esperaban 4"
    assert rows[0][-1] == "Empresa de prueba"
    assert [row[2] for row in rows[1:]] == titles
    assert all(row[-1] == case["company"] for row in rows[1:])
    assert [row[17] for row in rows[1:]] == ["manual", "audio-demo", "manual", "manual"]
    assert rows[3][16] == image_name and rows[4][16] == pdf_name
    assert not errors, f"Errores JavaScript: {errors}"

    result = {
        "company": case["company"],
        "expenses_saved_in_browser": 4,
        "expenses_in_csv": len(rows) - 1,
        "export_file": path.name,
        "manual": "PASS",
        "audio": "SIMULADO",
        "photo": "SOLO_NOMBRE_ARCHIVO",
        "pdf": "SOLO_NOMBRE_ARCHIVO",
        "message": "NO_IMPLEMENTADO",
        "email": "NO_IMPLEMENTADO",
        "status": "PASS_AVAILABLE_PATHS",
    }
    context.close()
    return result


def main() -> None:
    EXPORTS.mkdir(parents=True, exist_ok=True)
    results: list[dict] = []
    exported_paths: list[Path] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for number, case in enumerate(CASES, start=1):
            try:
                result = run_company(browser, case, number)
                results.append(result)
                exported_paths.append(EXPORTS / result["export_file"])
                print(f"PASS {case['company']}: 4 gastos locales, 4 filas CSV; audio simulado, foto/PDF manuales", flush=True)
            except Exception as error:
                results.append({"company": case["company"], "status": "FAIL", "error": str(error)})
                print(f"FAIL {case['company']}: {error}", flush=True)
        browser.close()

    report = {
        "synthetic_only": True,
        "scenarios": len(CASES),
        "passed_available_paths": sum(item["status"] == "PASS_AVAILABLE_PATHS" for item in results),
        "total_expenses_saved_locally": sum(item.get("expenses_saved_in_browser", 0) for item in results),
        "total_expenses_exported": sum(item.get("expenses_in_csv", 0) for item in results),
        "results": results,
        "not_validated": ["audio real", "lectura de fotos", "lectura de PDF", "mensajes", "correo", "almacenamiento de adjuntos", "aislamiento entre empresas en servidor"],
    }
    (ARTIFACTS / "ten_companies_channels_results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if exported_paths:
        with ZipFile(ARTIFACTS / "aldia-10-empresas-csv-demo.zip", "w", compression=ZIP_DEFLATED) as archive:
            for path in exported_paths:
                archive.write(path, arcname=path.name)
    assert report["passed_available_paths"] == len(CASES), f"Pasaron {report['passed_available_paths']} de {len(CASES)} escenarios disponibles"
    print("OK: 40 gastos locales y 40 filas exportadas; canales reales pendientes", flush=True)


if __name__ == "__main__":
    main()
