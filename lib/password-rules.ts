export function passwordRequirements(password: string) {
  return [password.length >= 8, /[a-z]/.test(password) && /[A-Z]/.test(password), /\d/.test(password)];
}

export function passwordStrength(password: string) {
  if (!password) return 0;
  const passed = passwordRequirements(password).filter(Boolean).length;
  if (passed < 2) return 1;
  if (passed < 3) return 2;
  return password.length >= 12 && new Set(password).size >= 7 ? 4 : 3;
}
