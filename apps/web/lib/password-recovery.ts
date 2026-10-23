export const PASSWORD_RECOVERY_PATH = "/auth/reset-password";
export const PASSWORD_RECOVERY_MIN_LENGTH = 12;
export const PASSWORD_RECOVERY_MAX_LENGTH = 256;

export function isValidEmailAddress(value: string) {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidNewPassword(value: string) {
  return value.length >= PASSWORD_RECOVERY_MIN_LENGTH && value.length <= PASSWORD_RECOVERY_MAX_LENGTH;
}

export function passwordRecoveryRedirectUrl(appUrl: string) {
  return new URL(`/auth/callback?next=${encodeURIComponent(PASSWORD_RECOVERY_PATH)}`, appUrl).toString();
}

export function callbackDestination(next: string | null) {
  return next === PASSWORD_RECOVERY_PATH ? PASSWORD_RECOVERY_PATH : "/onboarding";
}
