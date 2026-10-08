"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Course } from "./model";
import { readLegacyCourses, makeCourseBackup } from "./legacy-import";
import { importCourseAction } from "./actions";
import { announceCourseChange, refreshCourses } from "./use-courses";

export function CourseMigration({ courses }: { courses: Course[] }) {
  const [legacy, setLegacy] = useState<ReturnType<typeof readLegacyCourses> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const running = useRef(false);
  useEffect(() => {
    try { setLegacy(readLegacyCourses(window.localStorage)); }
    catch { setError("Eski kurslarni o‘qish uchun brauzer xotirasiga ruxsat kerak."); }
  }, []);
  const missing = legacy?.courses.filter(course => !courses.some(current => current.id === course.id)) ?? [];
  function backup() {
    const blob = new Blob([makeCourseBackup(window.localStorage)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `gradexa-data-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function migrate() {
    if (running.current || !missing.length) return;
    running.current = true; setBusy(true); setError("");
    let inserted = 0, skipped = 0;
    try {
      backup();
      for (let index = 0; index < missing.length; index++) {
        setMessage(`${index + 1}/${missing.length} — ${missing[index].title}`);
        // One bounded course per request, including the existing resized cover.
        const result = await importCourseAction(missing[index]);
        if (!result.ok) throw new Error(result.message);
        if (result.inserted) inserted++; else skipped++;
      }
      const summary = `${inserted} ta kurs ko‘chirildi.${skipped ? ` ${skipped} ta mavjud kurs o‘zgartirilmadi.` : ""}`;
      setMessage(summary); toast.success(summary);
    } catch (cause) {
      setMessage(`${inserted} ta kurs ko‘chirildi. Qolganlarini qayta urinishingiz mumkin.`);
      setError(cause instanceof Error ? cause.message : "Ko‘chirish javobi olinmadi. Ro‘yxatni yangilab, qayta urinib ko‘ring.");
    } finally {
      announceCourseChange(); await refreshCourses();
      running.current = false; setBusy(false);
    }
  }
  if (!legacy && !error) return null;
  if (!missing.length && !message && !error && !legacy?.error) return null;
  return <section className="ga-panel mb-5" aria-busy={busy}>
    <h2 className="font-semibold">Oldingi kurslarni ko‘chirish</h2>
    <p className="mt-2 text-sm">{legacy?.source === "sample" ? "Oldingi interfeysdagi namuna kurslaridan" : "Shu brauzerda saqlangan kurslardan"} {missing.length} tasi bazada yo‘q. Ularning IDlari saqlanadi. Zaxira fayli yuklanadi, mavjud bazadagi kurslar almashtirilmaydi.</p>
    {legacy?.error && <p className="field-error mt-3" role="alert">{legacy.error}</p>}
    {error && <p className="field-error mt-3" role="alert">{error}</p>}
    {message && <p className="mt-3 text-sm" role="status">{message}</p>}
    <div className="form-actions mt-3">
      <Button variant="outline" disabled={busy || !!legacy?.error} onClick={() => { try { backup(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Zaxira olinmadi."); } }}>Zaxirani yuklab olish</Button>
      <Button disabled={busy || !missing.length || !!legacy?.error} onClick={migrate}>{busy ? "Ko‘chirilmoqda…" : "Zaxira va Supabasega ko‘chirish"}</Button>
    </div>
  </section>;
}
