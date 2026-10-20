import assert from "node:assert/strict";
import { parseExpenseMessage } from "../lib/capture-parser.ts";

assert.deepEqual(parseExpenseMessage("55.000 de almuerzo"), { amount: 55000, currency: "COP", title: "almuerzo" });
assert.deepEqual(parseExpenseMessage("50 mil de cemento"), { amount: 50000, currency: "COP", title: "cemento" });
assert.deepEqual(parseExpenseMessage("40 USD de gasolina"), { amount: 40, currency: "USD", title: "gasolina" });
assert.deepEqual(parseExpenseMessage("12,50 EUR de transporte"), { amount: 12.5, currency: "EUR", title: "transporte" });
assert.equal(parseExpenseMessage("compré almuerzo"), null);

console.log("capture parser tests passed");
