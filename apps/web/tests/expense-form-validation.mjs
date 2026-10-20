import assert from "node:assert/strict";
import { hasAcceptedReceipt, isValidIsoDate, optionalReceipt } from "../lib/expense-form.ts";

const emptyForm = new FormData();
emptyForm.set("receipt", new File([], ""));
assert.equal(optionalReceipt(emptyForm.get("receipt")), null, "Un selector de archivo sin usar equivale a ausencia de comprobante");
assert.equal(hasAcceptedReceipt(optionalReceipt(emptyForm.get("receipt"))), true, "El comprobante opcional vacío no bloquea el gasto");

const jpeg = new File(["x"], "recibo.jpg", { type: "image/jpeg" });
assert.equal(hasAcceptedReceipt(optionalReceipt(jpeg)), true, "Un JPG no vacío se acepta");
assert.equal(hasAcceptedReceipt(optionalReceipt(new File(["x"], "recibo.gif", { type: "image/gif" }))), false, "Un tipo no permitido se rechaza");
assert.equal(hasAcceptedReceipt(optionalReceipt(new File([new Uint8Array(5_000_001)], "grande.pdf", { type: "application/pdf" }))), false, "Un archivo mayor a 5 MB se rechaza");
assert.equal(hasAcceptedReceipt(optionalReceipt(new File([], "vacio.pdf", { type: "application/pdf" }))), false, "Un archivo seleccionado sin contenido se rechaza");

assert.equal(isValidIsoDate("2028-02-29"), true, "Un día bisiesto válido se acepta");
assert.equal(isValidIsoDate("2026-02-29"), false, "Una fecha de calendario imposible se rechaza");
assert.equal(isValidIsoDate("2026-13-01"), false, "Un mes imposible se rechaza");

console.log("PASS expense form validation");
