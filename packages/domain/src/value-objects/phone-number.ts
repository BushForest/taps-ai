export function normalizePhoneNumber(input: string, defaultCountryCode = "+1"): string {
  const digits = input.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    return digits;
  }

  const normalizedDigits = digits.replace(/\D/g, "");

  if (normalizedDigits.length === 10) {
    return `${defaultCountryCode}${normalizedDigits}`;
  }

  if (normalizedDigits.length === 11 && normalizedDigits.startsWith("1")) {
    return `+${normalizedDigits}`;
  }

  throw new Error("Phone number could not be normalized to E.164");
}
