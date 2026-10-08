"use client";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { QuizView } from "./model";
import { readLegacyWorkspace, makeWorkspaceBackup } from "./legacy-import";
import { writeWorkspaceAction } from "./actions";
import { refreshWorkspace } from "./store";

export function WorkspaceMigration({ quizzes }: { quizzes: QuizView[] }) {
  const [legacy, setLegacy] = useState<ReturnType<typeof readLegacyWorkspace>>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const running = useRef(false);
  useEffect(() => { try { setLegacy(readLegacyWorkspace(window.localStorage)); } catch { setError("Eski yozuvlarni o‘qib bo‘lmadi. Zaxirani yuklab olishingiz mumkin."); } }, []);
  const missing = legacy?.quizzes.filter(q => !quizzes.some(current => current.id === q.id)) ?? [];
  function backup() {
    const url = URL.createObjectURL(new Blob([makeWorkspaceBackup(window.localStorage)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "gradexa-old-workspace-backup.json";
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  async function migrate() {
    if (running.current) return;
    running.current = true; setBusy(true); setError(""); let count = 0;
    try {
      backup();
      for (const quiz of missing) {
        setMessage(`${count + 1}/${missing.length} — ${quiz.title}`);
        const result = await writeWorkspaceAction("quiz-import", { ...quiz, revision: undefined });
        if (!result.ok) throw new Error(result.message);
        count++;
      }
      setMessage(`${count} ta test tekshirildi va ko‘chirildi. Mavjud yozuvlar almashtirilmadi.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Ko‘chirish amalga oshmadi."); setMessage(`${count} ta test ko‘chirildi. Qolganini qayta urinishingiz mumkin.`); }
    finally { await refreshWorkspace(); running.current=false; setBusy(false); }
  }
  if (!legacy && !error) return null;
  return <section className="ga-panel mb-5" aria-busy={busy}>
    <h2 className="font-semibold">Oldingi brauzer ma’lumotlari</h2>
    <p className="text-sm mt-2">{missing.length} ta test Supabase’da yo‘q. Ko‘chirishdan oldin kurslar va darslar bazada mavjud bo‘lsin. Asl brauzer yozuvlari saqlanadi.</p>
    <p className="text-sm mt-2">Eski mahalliy profil, progress va natijalar zaxirada qoladi. Ular tasdiqlangan akkaunt natijasi sifatida avtomatik yozilmaydi. Yangi amallar Supabase’da saqlanadi.</p>
    {error && <p className="field-error mt-3" role="alert">{error}</p>}{message && <p className="mt-3" role="status">{message}</p>}
    <div className="form-actions mt-3"><Button variant="outline" disabled={busy} onClick={() => { try { backup(); } catch { setError("Brauzer xotirasini o‘qib bo‘lmadi."); } }}>Eski ma’lumotlar zaxirasi</Button><Button disabled={busy || !missing.length} onClick={migrate}>{busy ? "Ko‘chirilmoqda…" : "Testlarni Supabase’ga ko‘chirish"}</Button></div>
  </section>;
}
