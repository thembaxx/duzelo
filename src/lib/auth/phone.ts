/**
 * Validation only. No SMS is sent and no auth session is created here.
 * Follow the SMS provider's routing rules for a final deliverability check.
 */
export type PhoneParseResult =
  | { ok: true; e164: string }
  | { ok: false; error: 'invalid_phone' };

const SOUTH_AFRICAN_POSSIBLE_MOBILE = /^\+27[678]\d{8}$/;

/**
 * Normalize common South African local/international spellings to E.164.
 * This verifies a plausible mobile-style number, not ownership or SMS reachability.
 */
export function normalizeSouthAfricanMobile(input: unknown): PhoneParseResult {
  if (typeof input !== 'string' || input.length > 48) {
    return { ok: false, error: 'invalid_phone' };
  }

  const cleaned = input.trim().replace(/[\s()-]/g, '');
  let normalized: string;
  if (/^0\d+$/.test(cleaned)) {
    normalized = '+27' + cleaned.slice(1);
  } else if (/^27\d+$/.test(cleaned)) {
    normalized = '+' + cleaned;
  } else {
    normalized = cleaned;
  }

  if (!SOUTH_AFRICAN_POSSIBLE_MOBILE.test(normalized)) {
    return { ok: false, error: 'invalid_phone' };
  }

  return { ok: true, e164: normalized };
}

/** Use only a partial identifier in UI, telemetry and generic failure responses. */
export function redactPhoneNumber(input: string): string {
  const value = normalizeSouthAfricanMobile(input);
  return value.ok ? '+27••••••' + value.e164.slice(-3) : 'your number';
}

export type OtpParseResult =
  | { ok: true; token: string }
  | { ok: false; error: 'invalid_code' };

/** Supabase SMS OTP is a six-digit code; this is form validation, not verification. */
export function parseSmsOtp(input: unknown): OtpParseResult {
  if (typeof input !== 'string') return { ok: false, error: 'invalid_code' };
  const token = input.trim();
  return /^\d{6}$/.test(token)
    ? { ok: true, token }
    : { ok: false, error: 'invalid_code' };
}

/**
 * UI countdown only; server + provider rate limits remain authoritative.
 * Does not store a timestamp or determine whether an OTP may be sent.
 */
export function resendCountdownSeconds(
  lastRequestedAtMilliseconds: number,
  nowMilliseconds: number,
  cooldownSeconds = 60,
): number {
  if (
    !Number.isFinite(lastRequestedAtMilliseconds) ||
    !Number.isFinite(nowMilliseconds) ||
    !Number.isFinite(cooldownSeconds) ||
    cooldownSeconds < 0
  ) return 0;
  return Math.max(
    0,
    Math.ceil((lastRequestedAtMilliseconds + cooldownSeconds * 1000 - nowMilliseconds) / 1000),
  );
}
