"use client";

import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import type { CourseInput } from "./model";
import type { CourseResult, CourseSnapshot } from "./repository";
import { readCoursesAction, saveCourseAction } from "./actions";

const initial: CourseSnapshot = { courses: [], ready: false, error: null };
let snapshot = initial;
let requestVersion = 0;
const listeners = new Set<() => void>();
const signalKey = "gradexa.v2.courses.refresh";
let channel: BroadcastChannel | null = null;
const emit = () => listeners.forEach(listener => listener());

export function refreshCourseStats() {
  if (!snapshot.ready) return;
  emit();
}
export async function refreshCourses(): Promise<CourseSnapshot> {
  const version = ++requestVersion;
  try {
    const result = await readCoursesAction();
    if (version !== requestVersion) return snapshot;
    if (!result.ok && snapshot.ready && !snapshot.error) {
      // Keep an open form and its input mounted during a temporary outage.
      toast.error(result.message);
      return snapshot;
    }
    snapshot = result.ok
      ? { courses: result.courses, ready: true, error: null }
      : { courses: [], ready: true, error: result.message };
  } catch {
    if (version !== requestVersion) return snapshot;
    if (snapshot.ready && !snapshot.error) {
      toast.error("Kurslar ro‘yxatini yangilab bo‘lmadi. Saqlashdan oldin internetni tekshiring.");
      return snapshot;
    }
    snapshot = { courses: [], ready: true, error: "Kurslarni yuklab bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring." };
  }
  refreshCourseStats();
  return snapshot;
}
const reload = () => { void refreshCourses(); };
function onStorage(event: StorageEvent) {
  if (event.key === signalKey || event.key === null) reload();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", reload);
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(signalKey);
      channel.onmessage = reload;
    }
    reload();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", reload);
      channel?.close(); channel = null;
      ++requestVersion;
      snapshot = initial;
    }
  };
}
export function announceCourseChange() {
  if (channel) channel.postMessage("changed");
  else {
    try { window.localStorage.setItem(signalKey, String(Date.now())); }
    catch { /* Focus and reload still fetch server data. */ }
  }
}
export function useCourses() {
  return useSyncExternalStore(subscribe, () => snapshot, () => initial);
}
export async function saveCourse(input: CourseInput, existing?: { id: string; updatedAt: string }): Promise<CourseResult> {
  try {
    const result = await saveCourseAction(input, existing);
    if (result.ok) {
      ++requestVersion; // A previous SELECT must not overwrite the committed row.
      snapshot = { courses: [result.course, ...snapshot.courses.filter(course => course.id !== result.course.id)], ready: true, error: null };
      refreshCourseStats();
      announceCourseChange();
    }
    return result;
  } catch {
    return { ok: false, message: "Saqlash javobi olinmadi. Qayta saqlashdan oldin kurslar ro‘yxatini tekshiring." };
  }
}
