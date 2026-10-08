"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Lesson } from "@/features/workspace/model";
import { importLessonAction } from "./actions";
import { makeLessonBackup, readLegacyLessons } from "./legacy-import";
import {
  announceLessonChange,
  refreshLessons,
} from "./use-lessons";

export function LessonMigration({ lessons }: { lessons: Lesson[] }) {
  const [legacy, setLegacy] = useState<ReturnType<
    typeof readLegacyLessons
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const running = useRef(false);

  useEffect(() => {
    try {
      setLegacy(readLegacyLessons(window.localStorage));
    } catch {
      setError("Eski darslarni o‘qish uchun brauzer xotirasiga ruxsat kerak.");
    }
  }, []);

  const missing =
    legacy?.lessons.filter(
      (lesson) => !lessons.some((current) => current.id === lesson.id),
    ) ?? [];

  function backup() {
    const blob = new Blob([makeLessonBackup(window.localStorage)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gradexa-lessons-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function migrate() {
    if (running.current || !missing.length) return;
    running.current = true;
    setBusy(true);
    setError("");
    let inserted = 0;
    let skipped = 0;
    try {
      backup();
      for (let index = 0; index < missing.length; index++) {
        setMessage(`${index + 1}/${missing.length} — ${missing[index].title}`);
        const result = await importLessonAction(missing[index]);
        if (!result.ok) throw new Error(result.message);
        if (result.inserted) inserted += 1;
        else skipped += 1;
      }
      const summary = `${inserted} ta dars ko‘chirildi.${
        skipped ? ` ${skipped} ta mavjud dars o‘zgartirilmadi.` : ""
      }`;
      setMessage(summary);
      toast.success(summary);
    } catch (cause) {
      setMessage(
        `${inserted} ta dars ko‘chirildi. Qolganlarini qayta urinishingiz mumkin.`,
      );
      setError(
        cause instanceof Error
          ? cause.message
          : "Ko‘chirish javobi olinmadi. Qayta urinib ko‘ring.",
      );
    } finally {
      announceLessonChange();
      await refreshLessons();
      running.current = false;
      setBusy(false);
    }
  }

  if (!legacy && !error) return null;
  if (!missing.length && !message && !error && !legacy?.error) return null;
  return (
    <section className="ga-panel mb-5" aria-busy={busy}>
      <h2 className="font-semibold">Oldingi darslarni ko‘chirish</h2>
      <p className="mt-2 text-sm">
        {legacy?.source === "sample"
          ? "Oldingi interfeysdagi namuna darslaridan"
          : "Shu brauzerda saqlangan darslardan"}{" "}
        {missing.length} tasi bazada yo‘q. Zaxira yuklanadi, mavjud Supabase
        yozuvlari almashtirilmaydi.
      </p>
      {legacy?.error && (
        <p className="field-error mt-3" role="alert">
          {legacy.error}
        </p>
      )}
      {error && (
        <p className="field-error mt-3" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-3 text-sm" role="status">
          {message}
        </p>
      )}
      <div className="form-actions mt-3">
        <Button
          variant="outline"
          disabled={busy || !!legacy?.error}
          onClick={() => {
            try {
              backup();
            } catch (cause) {
              setError(
                cause instanceof Error ? cause.message : "Zaxira olinmadi.",
              );
            }
          }}
        >
          Zaxirani yuklab olish
        </Button>
        <Button
          disabled={busy || !missing.length || !!legacy?.error}
          onClick={migrate}
        >
          {busy ? "Ko‘chirilmoqda…" : "Zaxira va Supabasega ko‘chirish"}
        </Button>
      </div>
    </section>
  );
}
