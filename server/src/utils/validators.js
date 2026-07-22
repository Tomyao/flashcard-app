const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return typeof value === "string" && EMAIL_RE.test(value.trim());
}

export function isValidPassword(value) {
  return typeof value === "string" && value.length >= 8;
}
