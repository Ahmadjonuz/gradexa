"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, CheckCircle2, Circle, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/app/forgot-password/actions";
import { updatePasswordAction } from "@/app/reset-password/actions";
import { type PublicLanguage } from "@/lib/public-language";
import { authFailure, type AuthFormState, type AuthIssue } from "@/lib/auth-form-feedback";
import { passwordRequirements, passwordStrength } from "@/lib/password-rules";
import { AuthFeedback, BackToLogin, LanguageControl, PasswordField, PublicBrand, PublicFooter, PublicSurface, StateIcon, SubmitButton, usePublicCopy } from "./public-ui";

const emptyState: AuthFormState = { error: null, success: null };
export type ResetSessionState = "valid" | "expired" | "unavailable";

function RecoveryFrame({ reset = false, children }: { reset?: boolean; children: ReactNode }) {
  const { t } = usePublicCopy();
  return <div className={"gx-shell gx-recovery-shell" + (reset ? " gx-reset-shell" : "")}>
    <header className="gx-recovery-header"><PublicBrand /><LanguageControl /></header>
    <div className="gx-recovery-layout"><section className="gx-recovery-content"><BackToLogin />{children}</section>
      <aside className="gx-recovery-art" aria-hidden="true"><div className="gx-orbit" /><div className="gx-art-glow" /><img src={reset ? "/auth-new-password-hero.png" : "/auth-password-reset-hero.png"} width={reset ? 1086 : 1165} height={reset ? 1448 : 1350} alt="" fetchPriority="high" /><p className="gx-recovery-art-copy">{reset ? t.strongPassword : t.opensDoors}<strong>{reset ? t.secureFuture : t.opensDoorsGold}</strong></p></aside>
    </div><PublicFooter reset={reset} />
  </div>;
}

function ForgotForm({ initialIssue }: { initialIssue?: AuthIssue }) {
  const { t, language } = usePublicCopy();
  const [state, action, pending] = useActionState(requestPasswordReset, initialIssue ? authFailure(initialIssue) : emptyState);
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!state.success) return;
    setCooldown(60);
    const timer = window.setInterval(() => setCooldown(value => {
      if (value <= 1) window.clearInterval(timer);
      return Math.max(0, value - 1);
    }), 1000);
    return () => window.clearInterval(timer);
  }, [state]);
  return <>
    <h1>{t.forgotTitle}</h1><p className="gx-description">{t.forgotDescription}</p>
    <form action={action} className="gx-form" aria-busy={pending}>
      <input type="hidden" name="language" value={language} />
      <div className="gx-field"><Label htmlFor="recovery-email">{t.email}</Label><div className="gx-input-wrap"><Mail aria-hidden="true" /><Input id="recovery-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="example@mail.com" required value={email} onChange={event => setEmail(event.target.value)} disabled={pending} /></div></div>
      <AuthFeedback state={state} />
      <SubmitButton pending={pending} disabled={cooldown > 0} label={cooldown > 0 ? t.wait + " · " + cooldown + " " + t.seconds : state.success ? t.resend : t.sendLink} pendingLabel={t.sending} />
      {state.success ? <div className="gx-sent-card" role="status"><StateIcon /><div><h2>{t.sentTitle}</h2><p>{t.sentDescription}</p></div></div> : <div className="gx-mail-notice"><span><Mail aria-hidden="true" /><i><Check aria-hidden="true" /></i></span><p>{t.notice}</p></div>}
    </form>
  </>;
}

export function ForgotPasswordAccess({ initialLanguage, initialIssue }: { initialLanguage?: PublicLanguage; initialIssue?: AuthIssue }) {
  return <PublicSurface initialLanguage={initialLanguage} className="gx-recovery"><RecoveryFrame><ForgotForm initialIssue={initialIssue} /></RecoveryFrame></PublicSurface>;
}

function ResetForm({ sessionState }: { sessionState: ResetSessionState }) {
  const { t, href } = usePublicCopy();
  const [state, action, pending] = useActionState(updatePasswordAction, emptyState);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const rules = passwordRequirements(password);
  const strength = passwordStrength(password);
  const strengthLabels = [t.strengthEmpty, t.strengthWeak, t.strengthFair, t.strengthGood, t.strengthStrong];
  const mismatch = confirmation !== password && (confirmTouched || submitted);
  useEffect(() => { if (state.success) { setPassword(""); setConfirmation(""); } }, [state.success]);

  if (state.success) return <div className="gx-recovery-state" role="status"><StateIcon /><h1>{t.resetSuccess}</h1><p className="gx-description">{t.resetSuccessDescription}</p><Button asChild className="gx-button gx-button-primary gx-submit"><Link href={href("/login")}>{t.login}</Link></Button></div>;
  const expired = sessionState === "expired" || state.issue === "expired";
  if (expired || sessionState === "unavailable") return <div className="gx-recovery-state"><StateIcon kind="error" /><h1>{expired ? t.expiredTitle : t.unavailableTitle}</h1><p className="gx-description">{expired ? t.expiredDescription : t.unavailableDescription}</p>{expired ? <Button asChild className="gx-button gx-button-primary gx-submit"><Link href={href("/forgot-password")}>{t.newLink}</Link></Button> : <Button type="button" className="gx-button gx-button-primary gx-submit" onClick={() => window.location.reload()}>{t.retry}</Button>}</div>;

  return <><h1>{t.resetTitle}</h1><p className="gx-description">{t.resetDescription}</p><form action={action} className="gx-form gx-reset-form" aria-busy={pending} onSubmit={event => { setSubmitted(true); if (!rules.every(Boolean) || password !== confirmation) { event.preventDefault(); if (!rules.every(Boolean)) document.getElementById("new-password")?.focus(); else document.getElementById("confirm-password")?.focus(); } }}>
    <PasswordField id="new-password" name="password" label={t.newPassword} placeholder={t.newPasswordPlaceholder} value={password} onChange={event => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" disabled={pending} aria-describedby="password-requirements" aria-invalid={submitted && !rules.every(Boolean)} />
    <PasswordField id="confirm-password" name="confirmation" label={t.confirm} placeholder={t.confirmPlaceholder} value={confirmation} onChange={event => setConfirmation(event.target.value)} onBlur={() => setConfirmTouched(true)} required minLength={8} autoComplete="new-password" disabled={pending} aria-invalid={mismatch} aria-describedby={mismatch ? "password-match" : undefined} />
    <ul id="password-requirements" className="gx-password-rules">{[t.ruleLength, t.ruleCase, t.ruleNumber].map((label, index) => <li key={label} className={rules[index] ? "is-met" : ""}>{rules[index] ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}<span>{label}</span><span className="sr-only">{rules[index] ? " ✓" : ""}</span></li>)}</ul>
    <div className="gx-strength"><div><span>{t.strength}</span><strong aria-live="polite">{strengthLabels[strength]}</strong></div><div className="gx-strength-bars" role="meter" aria-label={t.strength} aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength} aria-valuetext={strengthLabels[strength]} data-strength={strength}>{[0, 1, 2, 3].map(index => <i key={index} className={index < strength ? "is-active" : ""} />)}</div></div>
    {(mismatch || (confirmation && password === confirmation)) && <p id="password-match" className={"gx-match " + (mismatch ? "is-error" : "is-valid")} role="status">{mismatch ? t.mismatch : t.match}</p>}
    {submitted && !rules.every(Boolean) && <AuthFeedback state={authFailure("weak_password")} />}
    <AuthFeedback state={state} /><SubmitButton pending={pending} label={t.save} pendingLabel={t.saving} />
  </form><p className="gx-security-note"><ShieldCheck aria-hidden="true" />{t.securityNote}</p></>;
}

export function ResetPasswordAccess({ initialLanguage, sessionState }: { initialLanguage?: PublicLanguage; sessionState: ResetSessionState }) {
  return <PublicSurface initialLanguage={initialLanguage} className="gx-recovery gx-reset"><RecoveryFrame reset><ResetForm sessionState={sessionState} /></RecoveryFrame></PublicSurface>;
}
