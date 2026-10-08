"use client";

import { createContext, useContext, useState, type ReactNode, type ComponentProps } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CircleAlert, Eye, EyeOff, Globe2, LoaderCircle, LockKeyhole } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GradexaLogo } from "@/components/brand/gradexa-logo";
import { publicCopy, publicHref, readLanguage, type PublicLanguage } from "@/lib/public-language";
import { authMessages, type AuthFormState } from "@/lib/auth-form-feedback";
import "./public-pages.css";

const LanguageContext = createContext({ language: "uz" as PublicLanguage, setLanguage: (_value: PublicLanguage) => {} });

export function PublicSurface({ initialLanguage = "uz", className = "", children }: { initialLanguage?: PublicLanguage; className?: string; children: ReactNode }) {
  const [language, updateLanguage] = useState(initialLanguage);
  function setLanguage(value: PublicLanguage) {
    updateLanguage(value);
    const url = new URL(window.location.href);
    if (value === "uz") url.searchParams.delete("lang");
    else url.searchParams.set("lang", value);
    window.history.replaceState(window.history.state, "", url);
  }
  return <LanguageContext.Provider value={{ language, setLanguage }}><main lang={language} className={"gx-public " + className}>{children}</main></LanguageContext.Provider>;
}

export function usePublicCopy() {
  const { language } = useContext(LanguageContext);
  return { language, t: publicCopy[language], href: (path: string) => publicHref(path, language) };
}

export function LanguageControl({ pills = false }: { pills?: boolean }) {
  const { language, setLanguage } = useContext(LanguageContext);
  const t = publicCopy[language];
  if (pills) return <div className="gx-language-pills" role="group" aria-label={t.language}>{(["uz", "en", "ru"] as const).map(value => <button type="button" key={value} aria-pressed={value === language} onClick={() => setLanguage(value)}>{value.toUpperCase()}</button>)}</div>;
  return <Select value={language} onValueChange={value => setLanguage(readLanguage(value))}>
    <SelectTrigger className="gx-language-trigger" aria-label={t.language}><Globe2 aria-hidden="true" /><SelectValue /></SelectTrigger>
    <SelectContent className="gx-language-menu" position="popper" align="end"><SelectItem value="uz">UZ</SelectItem><SelectItem value="en">EN</SelectItem><SelectItem value="ru">RU</SelectItem></SelectContent>
  </Select>;
}

export function PublicBrand() {
  const { href } = usePublicCopy();
  return <GradexaLogo href={href("/")} />;
}

export function PublicFooter({ reset = false }: { reset?: boolean }) {
  const { t } = usePublicCopy();
  return <footer className="gx-footer"><div><span>{t.knowledge}</span><i aria-hidden="true" /><span>{t.footer}</span></div><p>{reset ? t.resetFooter : t.future}</p></footer>;
}

export function BackToLogin() {
  const { t, href } = usePublicCopy();
  return <Link className="gx-back" href={href("/login")}><ArrowLeft aria-hidden="true" />{t.back}</Link>;
}

export function SubmitButton({ pending, label, pendingLabel, disabled = false }: { pending: boolean; label: string; pendingLabel: string; disabled?: boolean }) {
  return <Button type="submit" className="gx-button gx-button-primary gx-submit" disabled={pending || disabled}>{pending && <LoaderCircle className="gx-spinner" aria-hidden="true" />}{pending ? pendingLabel : label}</Button>;
}

export function AuthFeedback({ state, id }: { state: AuthFormState; id?: string }) {
  const { language } = usePublicCopy();
  if (!state.error) return null;
  return <p className="gx-feedback gx-feedback-error" role="alert" id={id}><CircleAlert aria-hidden="true" /><span>{state.issue ? authMessages[language][state.issue] : state.error}</span></p>;
}

export function PasswordField({ id, label, placeholder, onBlur, ...props }: ComponentProps<typeof Input> & { id: string; label: string }) {
  const { t } = usePublicCopy();
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  return <div className="gx-field">
    <Label htmlFor={id}>{label}</Label>
    <div className="gx-input-wrap"><LockKeyhole aria-hidden="true" />
      <Input {...props} id={id} type={visible ? "text" : "password"} placeholder={placeholder} spellCheck={false} autoCapitalize="none" onKeyUp={event => setCapsLock(event.getModifierState("CapsLock"))} onBlur={event => { setCapsLock(false); onBlur?.(event); }} />
      <button className="gx-eye" type="button" disabled={props.disabled} aria-label={visible ? t.hidePassword : t.showPassword} aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button>
    </div>
    {capsLock && <span className="gx-field-hint" role="status">{t.capsLock}</span>}
  </div>;
}

export function StateIcon({ kind = "success" }: { kind?: "success" | "error" }) {
  return <span className={"gx-state-icon gx-state-icon-" + kind}>{kind === "success" ? <Check aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}</span>;
}
