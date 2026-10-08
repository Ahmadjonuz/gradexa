"use client";
import Link from "next/link";
import { ShieldCheck, KeyRound, LogOut, Monitor, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import type { ReactNode } from "react";
import "./account-pages.css";

export function AccountHeading({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return <header className="ga-heading"><div><h1>{title}</h1><p>{subtitle}</p></div>{children}</header>;
}
export function AccountPanel({ title, children, className = "", action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return <section className={"ga-panel " + className}>{title && <div className="ga-panel-heading"><h2>{title}</h2>{action}</div>}{children}</section>;
}
export function ScoreRing({ score, label = "Natija" }: { score: number; label?: string }) {
  const value = Math.min(100, Math.max(0, score));
  return <div className="ga-score-ring" role="img" aria-label={`${label}: ${score}%`}><svg viewBox="0 0 100 100" aria-hidden="true"><circle className="ga-ring-track" cx="50" cy="50" r="42" /><circle className="ga-ring-value" cx="50" cy="50" r="42" pathLength="100" strokeDasharray={`${value} ${100 - value}`} transform="rotate(-90 50 50)" /></svg><strong>{score}%</strong></div>;
}
export function StatusPill({ passed }: { passed: boolean }) {
  return <span className={"ga-pill " + (passed ? "is-good" : "is-bad")}>{passed ? "O‘tgan" : "O‘tmagan"}</span>;
}
export function SecurityPanel() {
  return <AccountPanel title="Xavfsizlik" className="ga-security"><div className="ga-security-icon"><ShieldCheck /></div><h3>Akkauntingiz himoyasi</h3><p>Parolni yangilash uchun emailingizga tasdiqlash havolasi yuboriladi.</p><Button variant="outline" asChild><Link href="/forgot-password"><KeyRound size={16} />Parolni o‘zgartirish</Link></Button><div className="ga-session"><Monitor /><div><strong>Joriy sessiya</strong><small>Shu brauzer orqali kirilgan</small></div><CheckCircle2 className="ga-green" size={18} /></div><LogoutButton className="ga-logout" /><p className="ga-muted ga-small"><LogOut size={14} />Chiqish ushbu sessiyani yakunlaydi.</p></AccountPanel>;
}
