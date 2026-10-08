"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Circle, Mail, ShieldCheck, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { updatePasswordAction } from "@/app/reset-password/actions";
import type { AuthFormState } from "@/lib/auth-form-feedback";
import type { PublicLanguage } from "@/lib/public-language";
import { passwordRequirements } from "@/lib/password-rules";
import { AuthFeedback, LanguageControl, PasswordField, PublicBrand, PublicFooter, PublicSurface, StateIcon, SubmitButton, usePublicCopy } from "./public-ui";
import "./invitation-pages.css";

const copy = {
  uz: { title: "Katta natijalar", gold: "shu yerdan boshlanadi.", intro: "Bilim sari yangi qadamingizga xush kelibsiz.", benefits: ["Sizga biriktirilgan kurslar", "Darslar va amaliy testlar", "Natijalarni kuzatish"], welcome: "Gradexa’ga xush kelibsiz!", description: "Taklifingizni yakunlash uchun akkauntingizga yangi parol o‘rnating.", verified: "Email manzili tasdiqlangan", newPassword: "Yangi parol", confirm: "Parolni tasdiqlang", acknowledgement: "Akkauntim uchun yangi parol o‘rnatishni tasdiqlayman.", save: "Parolni o‘rnatish", saving: "Saqlanmoqda…", rules: ["Kamida 8 belgi", "Katta va kichik harf", "Kamida bitta raqam"], mismatch: "Parollar bir xil emas.", done: "Hammasi tayyor!", doneText: "Parolingiz saqlandi. Yangi parol bilan tizimga kirishingiz mumkin.", login: "Tizimga kirish", expired: "Taklif havolasi faol emas", expiredText: "Emailingizdagi taklif havolasini oching. Uning muddati tugagan bo‘lsa, administratordan yangi taklif so‘rang.", unavailable: "Ulanishni tekshiring", unavailableText: "Taklifni hozir tekshirib bo‘lmadi. Qayta urinib ko‘ring.", retry: "Qayta urinish", note: "Kurslarga kirish administrator bergan ruxsatlarga bog‘liq." },
  en: { title: "Great results", gold: "start right here.", intro: "Welcome to the next step in your learning journey.", benefits: ["Your assigned courses", "Lessons and practical quizzes", "Track your progress"], welcome: "Welcome to Gradexa!", description: "Complete your invitation by setting a new password for your account.", verified: "Email address verified", newPassword: "New password", confirm: "Confirm password", acknowledgement: "I confirm that I want to set a new password for my account.", save: "Set password", saving: "Saving…", rules: ["At least 8 characters", "Uppercase and lowercase letters", "At least one number"], mismatch: "Passwords do not match.", done: "You’re all set!", doneText: "Your password has been saved. You can now sign in with your new password.", login: "Sign in", expired: "This invitation is not active", expiredText: "Open the invitation link in your email. If it has expired, ask your administrator for a new invitation.", unavailable: "Check your connection", unavailableText: "We could not verify the invitation. Please try again.", retry: "Try again", note: "Course access depends on the permissions granted by your administrator." },
  ru: { title: "Большие результаты", gold: "начинаются здесь.", intro: "Добро пожаловать на новый этап обучения.", benefits: ["Назначенные вам курсы", "Уроки и практические тесты", "Отслеживание результатов"], welcome: "Добро пожаловать в Gradexa!", description: "Завершите принятие приглашения, установив пароль для аккаунта.", verified: "Email подтверждён", newPassword: "Новый пароль", confirm: "Подтвердите пароль", acknowledgement: "Подтверждаю установку нового пароля для моего аккаунта.", save: "Установить пароль", saving: "Сохранение…", rules: ["Минимум 8 символов", "Прописные и строчные буквы", "Минимум одна цифра"], mismatch: "Пароли не совпадают.", done: "Всё готово!", doneText: "Пароль сохранён. Теперь вы можете войти с новым паролем.", login: "Войти", expired: "Приглашение неактивно", expiredText: "Откройте ссылку из письма. Если срок действия истёк, попросите администратора отправить новое приглашение.", unavailable: "Проверьте соединение", unavailableText: "Не удалось проверить приглашение. Повторите попытку.", retry: "Повторить", note: "Доступ к курсам зависит от разрешений администратора." },
};
const empty: AuthFormState = { error: null, success: null };
function InvitationForm({ email, sessionState }: { email: string; sessionState: "valid" | "expired" | "unavailable" }) {
  const { language, href } = usePublicCopy(), t = copy[language];
  const [state, action, pending] = useActionState(updatePasswordAction, empty);
  const [password, setPassword] = useState(""), [confirmation, setConfirmation] = useState(""), [accepted, setAccepted] = useState(false), [submitted, setSubmitted] = useState(false);
  const rules = passwordRequirements(password);
  const expired = sessionState === "expired" || state.issue === "expired";
  if (state.success) return <div className="gi-state" role="status"><StateIcon /><h1>{t.done}</h1><p>{t.doneText}</p><Button asChild className="gx-button gx-button-primary"><Link href={href("/login")}>{t.login}<ArrowRight /></Link></Button></div>;
  if (expired || sessionState === "unavailable") return <div className="gi-state"><StateIcon kind="error" /><h1>{expired ? t.expired : t.unavailable}</h1><p>{expired ? t.expiredText : t.unavailableText}</p>{expired ? <Button asChild className="gx-button gx-button-outline"><Link href={href("/login")}>{t.login}<ArrowRight /></Link></Button> : <Button type="button" className="gx-button gx-button-primary" onClick={() => window.location.reload()}>{t.retry}</Button>}</div>;
  return <><span className="gi-verified"><ShieldCheck size={16} />{t.verified}</span><h1>{t.welcome}</h1><p className="gi-description">{t.description}</p><form action={action} className="gx-form" aria-busy={pending} onSubmit={e => { setSubmitted(true); if (!accepted || !rules.every(Boolean) || password !== confirmation) { e.preventDefault(); document.getElementById(!rules.every(Boolean) ? "invite-password" : "invite-confirm")?.focus(); } }}>
    <div className="gx-field"><label htmlFor="invite-email">Email</label><div className="gx-input-wrap"><Mail aria-hidden="true" /><Input id="invite-email" type="email" value={email} readOnly autoComplete="email" /></div></div>
    <PasswordField id="invite-password" name="password" label={t.newPassword} required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} disabled={pending} aria-describedby="invite-rules" aria-invalid={submitted && !rules.every(Boolean)} />
    <PasswordField id="invite-confirm" name="confirmation" label={t.confirm} required minLength={8} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={pending} aria-invalid={submitted && password !== confirmation} />
    <ul id="invite-rules" className="gx-password-rules">{t.rules.map((rule, index) => <li key={rule} className={rules[index] ? "is-met" : ""}>{rules[index] ? <CheckCircle2 /> : <Circle />}<span>{rule}</span></li>)}</ul>
    {submitted && password !== confirmation && <p className="gx-feedback gx-feedback-error" role="alert">{t.mismatch}</p>}
    <label className="gi-ack" htmlFor="invite-ack"><Checkbox id="invite-ack" required checked={accepted} disabled={pending} onCheckedChange={checked => setAccepted(checked === true)} /><span>{t.acknowledgement}</span></label>
    <AuthFeedback state={state} /><SubmitButton pending={pending} label={t.save} pendingLabel={t.saving} />
  </form><p className="gi-note"><ShieldCheck size={16} />{t.note}</p></>;
}
function InvitationContent(props: { email: string; sessionState: "valid" | "expired" | "unavailable" }) {
  const { language } = usePublicCopy(), t = copy[language];
  const icons = [BookOpen, CheckCircle2, Trophy];
  return <div className="gx-shell gi-shell"><header className="gi-header"><PublicBrand /><LanguageControl /></header><div className="gi-layout"><section className="gi-intro"><span className="gx-eyebrow">LEARNING, ELEVATED</span><h2>{t.title}<br /><span>{t.gold}</span></h2><p>{t.intro}</p><img src="/images/gradexa/learning-hero.png" width="700" height="466" alt="" fetchPriority="high" /><ul>{t.benefits.map((benefit, index) => { const Icon = icons[index]; return <li key={benefit}><Icon /><span>{benefit}</span></li>; })}</ul></section><section className="gi-card"><InvitationForm {...props} /></section></div><PublicFooter /></div>;
}
export function InvitationAccess({ initialLanguage, ...props }: { initialLanguage: PublicLanguage; email: string; sessionState: "valid" | "expired" | "unavailable" }) {
  return <PublicSurface initialLanguage={initialLanguage} className="gi-public"><InvitationContent {...props} /></PublicSurface>;
}
