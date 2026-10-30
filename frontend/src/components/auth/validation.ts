// Mirrors the API's rules so users see problems on blur; the API stays the source of truth.

export function validateName(name: string) {
  if (!name.trim()) return "Enter your name.";
  if (name.trim().length > 80) return "Use 80 characters or fewer.";
  return null;
}

export function validateEmail(email: string) {
  if (!email.trim()) return "Enter your email.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Enter a valid email address.";
  return null;
}

export function validateNewPassword(password: string) {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 128) return "Use 128 characters or fewer.";
  return null;
}

export function validateLoginPassword(password: string) {
  return password ? null : "Enter your password.";
}
