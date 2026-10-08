export type AuthIssue = "invalid_email" | "missing_password" | "invalid_credentials" | "email_unconfirmed" | "connection" | "configuration" | "rate_limit" | "expired" | "weak_password" | "password_mismatch" | "same_password" | "profile_missing" | "profile_inactive" | "unknown";
export type AuthFormState = { error: string | null; success: string | null; issue?: AuthIssue };

export const authMessages = {
  uz: { invalid_email: "Email manzilini to‘g‘ri kiriting.", missing_password: "Parolingizni kiriting.", invalid_credentials: "Email yoki parol noto‘g‘ri.", email_unconfirmed: "Avval emailingizga yuborilgan tasdiqlash havolasini oching.", connection: "Server bilan aloqa o‘rnatilmadi. Ulanishni tekshirib, qayta urinib ko‘ring.", configuration: "Kirish xizmati sozlamalari topilmadi. Administratorga murojaat qiling.", rate_limit: "So‘rovlar soni cheklangan. Birozdan so‘ng yana urinib ko‘ring.", expired: "Tiklash havolasi eskirgan yoki amal qilmaydi. Yangisini so‘rang.", weak_password: "Parol kamida 8 belgi, katta va kichik harf hamda raqamdan iborat bo‘lsin.", password_mismatch: "Parollar bir xil emas.", same_password: "Yangi parol oldingi paroldan farq qilishi kerak.", profile_missing: "Foydalanuvchi profili topilmadi. Administratorga murojaat qiling.", profile_inactive: "Bu profil hozir faol emas. Administratorga murojaat qiling.", unknown: "Amal bajarilmadi. Birozdan so‘ng qayta urinib ko‘ring." },
  en: { invalid_email: "Enter a valid email address.", missing_password: "Enter your password.", invalid_credentials: "The email or password is incorrect.", email_unconfirmed: "Open the confirmation link sent to your email first.", connection: "Could not connect to the server. Check the connection and try again.", configuration: "Sign-in settings are missing. Please contact the administrator.", rate_limit: "Too many requests. Please try again later.", expired: "This reset link is expired or invalid. Request a new one.", weak_password: "Use at least 8 characters, uppercase and lowercase letters, and a number.", password_mismatch: "Passwords do not match.", same_password: "Choose a password different from your previous password.", profile_missing: "Your profile could not be found. Please contact the administrator.", profile_inactive: "This profile is inactive. Please contact the administrator.", unknown: "The request could not be completed. Please try again shortly." },
  ru: { invalid_email: "Введите правильный email.", missing_password: "Введите пароль.", invalid_credentials: "Неверный email или пароль.", email_unconfirmed: "Сначала откройте ссылку подтверждения из письма.", connection: "Не удалось связаться с сервером. Проверьте соединение и повторите попытку.", configuration: "Не найдены настройки входа. Обратитесь к администратору.", rate_limit: "Слишком много запросов. Повторите попытку позже.", expired: "Ссылка устарела или недействительна. Запросите новую.", weak_password: "Используйте минимум 8 символов, прописные и строчные буквы и цифру.", password_mismatch: "Пароли не совпадают.", same_password: "Новый пароль должен отличаться от предыдущего.", profile_missing: "Профиль не найден. Обратитесь к администратору.", profile_inactive: "Профиль неактивен. Обратитесь к администратору.", unknown: "Не удалось выполнить запрос. Повторите попытку позже." },
};

export function authFailure(issue: AuthIssue): AuthFormState {
  return { error: authMessages.uz[issue], success: null, issue };
}

export function authIssue(error: unknown): AuthIssue {
  if (!error || typeof error !== "object") return "unknown";
  const { code, status, message } = error as { code?: string; status?: number; message?: string };
  if (status === 429 || code === "over_email_send_rate_limit" || code === "over_request_rate_limit") return "rate_limit";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(message ?? "")) return "invalid_credentials";
  if (code === "email_not_confirmed") return "email_unconfirmed";
  if (code === "same_password") return "same_password";
  if (code === "weak_password") return "weak_password";
  if (["session_not_found", "session_expired", "otp_expired", "bad_jwt", "refresh_token_not_found", "flow_state_expired", "flow_state_not_found"].includes(code ?? "") || /auth session missing/i.test(message ?? "")) return "expired";
  if (/fetch failed|network|timeout|certificate|connect|socket/i.test(message ?? "")) return "connection";
  if (/sozlamalari|configuration|invalid api key/i.test(message ?? "")) return "configuration";
  return "unknown";
}
