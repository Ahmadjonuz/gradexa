"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/app/login/actions";
import type { PublicLanguage } from "@/lib/public-language";
import type { AuthFormState } from "@/lib/auth-form-feedback";
import { AuthFeedback, LanguageControl, PasswordField, PublicBrand, PublicSurface, SubmitButton, usePublicCopy } from "./public-ui";

const initialState: AuthFormState = { error: null, success: null };
function LoginContent({ next }: { next?: string }) {
  const { t, href } = usePublicCopy();
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return <div className="gx-shell gx-login-shell">
    <section className="gx-login-story"><img className="gx-login-art" src="/images/gradexa/learning-hero.png" width="1536" height="1024" alt="" fetchPriority="high" /><div className="gx-login-art-shade" /><div className="gx-login-brand"><PublicBrand /></div><div className="gx-login-story-copy"><p className="gx-eyebrow">{t.knowledge} · {t.practice} · {t.outcome}</p><h1>{t.loginHero} <span>{t.loginHeroGold}</span></h1><p>{t.loginHeroDescription}</p></div><p className="gx-login-quote">{t.loginQuote}</p></section>
    <section className="gx-login-panel"><div className="gx-login-toolbar"><Link href={href("/")} className="gx-back"><ArrowLeft aria-hidden="true" />{t.home}</Link><LanguageControl pills /></div>
      <div className="gx-login-card"><h2>{t.loginTitle}</h2><p className="gx-description">{t.loginDescription}</p>
        <form action={formAction} className="gx-form" aria-busy={pending}><input type="hidden" name="next" value={next ?? ""} /><div className="gx-field"><Label htmlFor="login-email">{t.email}</Label><div className="gx-input-wrap"><Mail aria-hidden="true" /><Input id="login-email" name="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={event => setEmail(event.target.value)} placeholder={t.emailPlaceholder} required disabled={pending} /></div></div>
          <PasswordField id="login-password" label={t.password} name="password" autoComplete="current-password" placeholder={t.passwordPlaceholder} value={password} onChange={event => setPassword(event.target.value)} required disabled={pending} />
          <Link className="gx-forgot-link" href={href("/forgot-password")}>{t.forgot}</Link><AuthFeedback state={state} />
          <SubmitButton pending={pending} label={t.login} pendingLabel={t.signingIn} />
        </form>
        <div className="gx-login-security"><span><ShieldCheck aria-hidden="true" />{t.protected}</span><p>{t.privacy}</p></div>
      </div>
    </section>
  </div>;
}

export function LoginAccess({ initialLanguage, initialNext }: { initialLanguage?: PublicLanguage; initialNext?: string }) {
  return <PublicSurface initialLanguage={initialLanguage} className="gx-login"><LoginContent next={initialNext} /></PublicSurface>;
}
