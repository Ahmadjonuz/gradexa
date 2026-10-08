"use client";
import { useId, useRef, useState } from "react";
import { Trash2, LoaderCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { previewDeletionAction, deleteRecordAction } from "./actions";
import { countLabels, deletionLabels, type DeletionKind, type DeletionPreview } from "./model";
import { refreshWorkspace } from "@/features/workspace/store";
import { refreshCourses, announceCourseChange } from "@/features/courses/use-courses";
import { refreshLessons, announceLessonChange } from "@/features/lessons/use-lessons";
import { refreshEnrollments } from "@/features/enrollments/use-enrollments";

async function refreshDeletedData() {
  await Promise.allSettled([refreshWorkspace(), refreshCourses(), refreshLessons(), refreshEnrollments()]);
  announceCourseChange(); announceLessonChange();
  if (typeof BroadcastChannel !== "undefined") { const channel = new BroadcastChannel("gradexa.workspace"); channel.postMessage("changed"); channel.close(); }
}
export function DeleteRecordButton({ kind, id, name, disabled = false, compact = false, onDeleted }: {
  kind: DeletionKind; id: string; name: string; disabled?: boolean; compact?: boolean; onDeleted?: () => void;
}) {
  const inputId = useId(), running = useRef(false), generation = useRef(0);
  const [open, setOpen] = useState(false), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<DeletionPreview | null>(null), [confirmation, setConfirmation] = useState(""), [error, setError] = useState("");
  async function inspect() {
    const version = ++generation.current;
    setLoading(true); setError(""); setPreview(null); setConfirmation("");
    try {
      const result = await previewDeletionAction({ kind, id });
      if (version !== generation.current) return;
      if (result.ok) setPreview(result.preview); else setError(result.message);
    } catch { if (version === generation.current) setError("Ma’lumotlar yuklanmadi. Internetni tekshiring."); }
    finally { if (version === generation.current) setLoading(false); }
  }
  function close() { if (!running.current) { ++generation.current; setOpen(false); } }
  async function remove() {
    if (running.current || !preview || preview.blocked || confirmation.trim() !== preview.name) return;
    running.current = true; setBusy(true); setError("");
    try {
      const result = await deleteRecordAction({ kind, id, fingerprint: preview.fingerprint, confirmation });
      if (result.ok) {
        toast.success(result.message); setOpen(false);
        await refreshDeletedData(); onDeleted?.();
      } else {
        setError(result.message); setPreview(null); setConfirmation(""); toast.error(result.message);
        if (result.refresh) await refreshDeletedData();
      }
    } catch { setError("O‘chirish javobi olinmadi. Qayta tekshirib, ro‘yxatni yangilang."); setPreview(null); }
    finally { running.current = false; setBusy(false); }
  }
  return <>
    <Button type="button" variant="ghost" size={compact ? "icon" : "sm"} className="text-destructive hover:text-destructive" disabled={disabled || busy} aria-label={`${name} — o‘chirish`} title="O‘chirish" onClick={() => { setOpen(true); void inspect(); }}><Trash2 size={17} />{!compact && "O‘chirish"}</Button>
    <AlertDialog open={open} onOpenChange={value => { if (!value) close(); }}>
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}>
        <AlertDialogHeader><AlertDialogTitle>{deletionLabels[kind]}ni o‘chirish</AlertDialogTitle><AlertDialogDescription>“{preview?.name ?? name}” yozuvini tekshiring. O‘chirilgan ma’lumotni bu oynadan qaytarib bo‘lmaydi.</AlertDialogDescription></AlertDialogHeader>
        {loading && <p role="status" className="flex items-center gap-2 text-sm"><LoaderCircle className="animate-spin" size={18} />Bog‘langan ma’lumotlar tekshirilmoqda…</p>}
        {preview && <div className="space-y-4">
          {Object.keys(preview.counts).length > 0 && <dl className="space-y-2 rounded-lg border border-border p-3 text-sm">{Object.entries(preview.counts).map(([key, count]) => <div key={key} className="flex justify-between gap-3"><dt>{countLabels[key] ?? key}</dt><dd className="font-semibold">{count}</dd></div>)}</dl>}
          {preview.blocked ? <p role="alert" className="text-sm text-destructive">{preview.blocked}</p> : <>
            <p className="text-sm leading-6 text-muted-foreground">{preview.authAccount ? "Login hisobi, kursga yozilishlar, natijalar, qaydlar va bog‘langan takliflar birga o‘chiriladi. Talaba qayta kira olmaydi." : kind === "lesson" ? "Dars bilan birga unga tegishli barcha talabalar progressi va qaydlari o‘chiriladi. Kursning yakunlash foizi qayta hisoblanadi." : kind === "quiz" ? "Test va uning savollari o‘chiriladi." : "Tanlangan yozuv bazadan o‘chiriladi."}</p>
            {preview.pending && <p role="status" className="text-sm">Oldingi o‘chirish yakunlanmagan. Hisob to‘xtatilgan; qayta tasdiqlab yakunlashingiz mumkin.</p>}
            <label htmlFor={inputId} className="block text-sm font-medium">Tasdiqlash uchun aynan shu nomni yozing: <strong className="break-words">{preview.name}</strong></label>
            <Input id={inputId} autoComplete="off" value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)} aria-describedby={`${inputId}-error`} />
          </>}
        </div>}
        {error && <p id={`${inputId}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Yopish</AlertDialogCancel>
          {!preview && !loading && <Button type="button" variant="outline" disabled={busy} onClick={() => void inspect()}><RefreshCw size={16} />Qayta tekshirish</Button>}
          {preview && !preview.blocked && <Button type="button" variant="destructive" disabled={busy || loading || confirmation.trim() !== preview.name} onClick={() => void remove()}>{busy ? <LoaderCircle className="animate-spin" size={17} /> : <Trash2 size={17} />}{busy ? "O‘chirilmoqda…" : "Butunlay o‘chirish"}</Button>}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
