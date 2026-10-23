import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PASSWORD_RECOVERY_PATH,
  callbackDestination,
  isValidEmailAddress,
  isValidNewPassword,
  passwordRecoveryRedirectUrl
} from "../lib/password-recovery.ts";

assert.equal(isValidEmailAddress("clamasanber@gmail.com"), true);
assert.equal(isValidEmailAddress("not-an-email"), false);
assert.equal(isValidEmailAddress("user@localhost"), false);
assert.equal(isValidNewPassword("una-clave-segura"), true);
assert.equal(isValidNewPassword("corta"), false);
assert.equal(isValidNewPassword("x".repeat(257)), false);
assert.equal(callbackDestination(PASSWORD_RECOVERY_PATH), PASSWORD_RECOVERY_PATH);
assert.equal(callbackDestination("https://attacker.example"), "/onboarding");
assert.equal(callbackDestination("//attacker.example"), "/onboarding");
assert.equal(passwordRecoveryRedirectUrl("https://aldia-app-pilot.vercel.app"), "https://aldia-app-pilot.vercel.app/auth/callback?next=%2Fauth%2Freset-password");

const root = resolve(import.meta.dirname, "..");
const forgotAction = readFileSync(resolve(root, "app/auth/forgot-password/actions.ts"), "utf8");
const resetAction = readFileSync(resolve(root, "app/auth/reset-password/actions.ts"), "utf8");
const callback = readFileSync(resolve(root, "app/auth/callback/route.ts"), "utf8");
const resetPage = readFileSync(resolve(root, "app/auth/reset-password/page.tsx"), "utf8");
assert.ok(forgotAction.includes("resetPasswordForEmail"), "La recuperación debe solicitar un correo a Supabase");
assert.ok(forgotAction.includes("passwordRecoveryRedirectUrl"), "El correo debe volver por el callback autorizado");
assert.ok(resetAction.includes("supabase.auth.getUser()"), "El cambio requiere una sesión autenticada válida");
assert.ok(resetAction.includes("supabase.auth.updateUser({ password })"), "Solo la propia sesión puede elegir la nueva contraseña");
assert.ok(resetAction.includes("supabase.auth.signOut()"), "El flujo termina cerrando la sesión de recuperación");
assert.ok(callback.includes("callbackDestination"), "El callback debe restringir su destino");
assert.ok(resetPage.includes("autoComplete=\"new-password\""), "El formulario debe marcar campos como contraseña nueva");
assert.ok(callback.includes("sb_flow_id"), "El callback conserva el identificador de flujo PKCE cuando Supabase lo emite");

console.log("PASS password recovery helpers");
