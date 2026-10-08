"use client";
import { createContext, createElement, useContext, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";
import type { GradexaProfile } from "@/lib/auth";
import { useCourses } from "@/features/courses/use-courses";
import { withLearningStats } from "@/features/courses/learning-stats";
import { useEnrollments, refreshEnrollments } from "@/features/enrollments/use-enrollments";
import { useLessons, refreshLessons } from "@/features/lessons/use-lessons";
import { emptyWorkspace, type LiveWorkspaceData } from "./model";
import { readWorkspaceAction, writeWorkspaceAction } from "./actions";
import type { WorkspaceCommand, WriteResult } from "./supabase-repository";
const initial = { data: emptyWorkspace, actorId: "", ready: false, error: null as string | null };
let snapshot: typeof initial = initial;
let generation = 0;
let channel: BroadcastChannel | null = null;
const listeners = new Set<() => void>();
const accountContext = createContext<GradexaProfile | null>(null);
const emit = () => listeners.forEach(listener => listener());
export function StudentAccountScope({ profile, children }: { profile: GradexaProfile; children: ReactNode }) {
  return createElement(accountContext.Provider, { value: profile }, children);
}
export async function refreshWorkspace() {
  const current = ++generation;
  try {
    const result = await readWorkspaceAction();
    if (current !== generation) return;
    if (result.ok) snapshot = { data: result.data, actorId: result.actorId, ready: true, error: null };
    else if (!result.denied && snapshot.ready && !snapshot.error) { toast.error(result.message); return; }
    else snapshot = { ...initial, ready: true, error: result.message };
  } catch {
    if (current !== generation) return;
    if (snapshot.ready && !snapshot.error) { toast.error("Ma’lumotlarni yangilab bo‘lmadi. Internetni tekshiring."); return; }
    snapshot = { ...initial, ready: true, error: "Ma’lumotlar yuklanmadi. Internetni tekshirib, qayta urinib ko‘ring." };
  }
  emit();
}
const reload = () => { void refreshWorkspace(); };
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("focus", reload);
    if (typeof BroadcastChannel !== "undefined") { channel = new BroadcastChannel("gradexa.workspace"); channel.onmessage = reload; }
    reload();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { window.removeEventListener("focus", reload); channel?.close(); channel = null; ++generation; snapshot = initial; }
  };
}
export function useWorkspace() {
  const account = useContext(accountContext);
  const state = useSyncExternalStore(subscribe, () => snapshot, () => initial);
  const courses = useCourses(), enrollments = useEnrollments(), lessons = useLessons();
  const matchingAccount = !account || state.actorId === account.id;
  const data: LiveWorkspaceData = { ...(matchingAccount ? state.data : emptyWorkspace), lessons: lessons.lessons };
  return {
    ...state, data, courses: withLearningStats(courses.courses, data),
    ready: state.ready && courses.ready && lessons.ready && (!account || enrollments.ready),
    error: state.error || courses.error || lessons.error || (account ? enrollments.error : null) || (!matchingAccount && state.ready ? "Akkaunt o‘zgargan. Sahifani yangilang." : null),
    student: data.students.find(s => s.id === (account?.id ?? state.actorId)),
  };
}
export type Workspace = ReturnType<typeof useWorkspace>;
export async function saveWorkspace(kind: WorkspaceCommand, data: unknown): Promise<WriteResult> {
  try {
    const result = await writeWorkspaceAction(kind, data);
    if (result.ok) {
      await refreshWorkspace();
      if (kind === "student") await Promise.all([refreshEnrollments(), refreshLessons()]);
      channel?.postMessage("changed");
    }
    return result;
  } catch { return { ok: false, message: "Saqlash javobi olinmadi. Ro‘yxatni yangilab tekshiring." }; }
}
export function submitAttempt(quizId: string, answers: number[], revision: string, requestId: string) {
  return saveWorkspace("submit", { quizId, answers, revision, requestId });
}
