"use client";
import Link from "next/link";
import { useState, useRef } from "react";
import { Bell, CheckCircle2, Globe2, Save, Settings2, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useWorkspace, saveWorkspace } from "./store";
import { WorkspaceGate, saved } from "./ui";
import { AccountHeading, AccountPanel, SecurityPanel } from "./account-ui";
import { initials } from "./account-utils";
import type { WorkspaceData } from "./model";
import type { GradexaProfile } from "@/lib/auth";

export function Settings({ account }: { account?: GradexaProfile | null }) {
  const w = useWorkspace();
  return <WorkspaceGate workspace={w}><div className="ga-page"><AccountHeading title="Sozlamalar" subtitle="Profilingiz va ish maydoningizni o‘zingizga moslang." /><SettingsForm initial={w.data.preferences} account={account} invitations={w.data.students.filter(s => s.status === "invited").length} /></div></WorkspaceGate>;
}
function SettingsForm({ initial, account, invitations }: { initial: WorkspaceData["preferences"]; account?: GradexaProfile | null; invitations: number }) {
  const [saving, setSaving] = useState(false);
  const version = useRef(initial.updatedAt);
  const [value, setValue] = useState(initial), [tab, setTab] = useState("general"), [message, setMessage] = useState("");
  const name = account?.full_name ?? "Administrator";
  const update = (patch: Partial<typeof value>) => { setValue(current => ({ ...current, ...patch })); setMessage(""); };
  const tabs = [["general", "Umumiy", Settings2], ["profile", "Profil", User], ["security", "Xavfsizlik", ShieldCheck], ["notifications", "Bildirishnomalar", Bell], ["language", "Til", Globe2]] as const;
  const profile = <AccountPanel title="Profil ma’lumotlari"><div className="ga-person mb-6"><span className="ga-avatar">{initials(name)}</span><div><h3>{name}</h3><p className="ga-muted mt-1">{account?.role === "admin" ? "Administrator" : "Owner"}</p></div></div><div className="ga-fields"><label>Ism va familiya<Input value={name} readOnly /></label>{account?.email && <label>Email<Input value={account.email} readOnly /></label>}<label>Qisqa tavsif<Textarea value={value.ownerBio} onChange={e => update({ ownerBio: e.target.value })} maxLength={1000} rows={4} placeholder="O‘quv maqsadlaringiz haqida…" /></label></div><p className="ga-field-note">Tavsif Supabase’da saqlanadi. Akkaunt ismi va emaili administrator tomonidan boshqariladi.</p></AccountPanel>;
  const notifications = <AccountPanel title="Bildirishnomalar"><p className="ga-text">Kutayotgan takliflar haqida menyuda belgi ko‘rsating.</p><div className="ga-toggle"><label htmlFor="show-notifications">Takliflar belgisi<small>Yuqoridagi qo‘ng‘iroqda yangi takliflar borligini ko‘rsatadi.</small></label><Switch disabled={saving} id="show-notifications" checked={value.showNotifications} onCheckedChange={showNotifications => update({ showNotifications })} /></div><Button variant="outline" asChild><Link href="/admin/students?status=invited">{invitations} ta kutayotgan taklifni ko‘rish</Link></Button><p className="ga-field-note">Bu sozlama menyudagi belgiga ta’sir qiladi. Email jo‘natish xizmati alohida boshqariladi.</p></AccountPanel>;
  return <Tabs value={tab} onValueChange={setTab}>
    <TabsList className="ga-tabs" variant="line" aria-label="Sozlamalar bo‘limlari">{tabs.map(([id, label, Icon]) => <TabsTrigger key={id} value={id} disabled={saving}><Icon />{label}</TabsTrigger>)}</TabsList>
    {tab === "security" ? <TabsContent value="security"><div className="ga-narrow"><SecurityPanel /></div></TabsContent> :
    <TabsContent value={tab}>
    <form onSubmit={async e => { e.preventDefault(); if (saving) return; setSaving(true); const result = await saveWorkspace("preferences", { ...value, updatedAt: version.current }); setSaving(false); if (saved(result) && result.ok) { version.current = result.updatedAt; setMessage("O‘zgarishlar Supabase’da saqlandi."); } }}>
      <fieldset disabled={saving} className="contents" aria-busy={saving}>
      {tab === "general" && <div className="ga-settings-grid"><AccountPanel title="Platforma sozlamalari"><div className="ga-fields"><label>Platforma nomi<Input value="Gradexa" readOnly /></label><div><p className="mb-2">Platforma logotipi</p><div className="ga-brand-preview"><img src="/brand/gradexa-mark.svg" alt="" width="47" height="47" /><div><strong>Gradexa</strong><small>Bilim. Natija. Yangi imkoniyat.</small></div></div></div><label>Vaqt mintaqasi<Input value="Toshkent (UTC +05:00)" readOnly /></label><label>Haftalik maqsad (darslar)<Input type="number" min={1} max={40} required value={value.weeklyGoal} onChange={e => update({ weeklyGoal: Number(e.target.value) })} /><small>Talaba kabinetidagi haftalik o‘quv maqsadi.</small></label></div><div className="ga-toggle"><label htmlFor="compact-tables">Ixcham jadvallar<small>Ma’lumotlarni zichroq ko‘rsatish.</small></label><Switch disabled={saving} id="compact-tables" checked={value.compact} onCheckedChange={compact => update({ compact })} /></div></AccountPanel><div className="ga-settings-stack">{profile}{notifications}</div></div>}
      {tab === "profile" && <div className="ga-narrow">{profile}</div>}
      {tab === "notifications" && <div className="ga-narrow">{notifications}</div>}
      {tab === "language" && <AccountPanel title="Til sozlamalari" className="ga-narrow"><div className="ga-fields"><label>Kabinet tili<Input readOnly value="O‘zbekcha" /></label></div><p className="ga-text mt-5">Bosh sahifa va kirish oynalari uch tilda mavjud. Tilni o‘sha sahifaning yuqori menyusidan tanlashingiz mumkin.</p><div className="ga-language-links"><Button asChild variant="outline"><Link href="/?lang=uz">O‘zbekcha</Link></Button><Button asChild variant="outline"><Link href="/?lang=en">English</Link></Button><Button asChild variant="outline"><Link href="/?lang=ru">Русский</Link></Button></div></AccountPanel>}
      {tab !== "security" && tab !== "language" && <div className="ga-save-bar"><p role="status">{message ? <><CheckCircle2 size={17} className="ga-green" />{message}</> : "Sozlamalar ish maydoni uchun Supabase’da saqlanadi."}</p><Button type="submit" disabled={saving}><Save size={17} />{saving ? "Saqlanmoqda…" : "O‘zgarishlarni saqlash"}</Button></div>}
    </fieldset></form></TabsContent>}
  </Tabs>;
}
