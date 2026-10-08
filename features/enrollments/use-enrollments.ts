"use client";

import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  enrollInCourseAction,
  readMyEnrollmentsAction,
} from "./actions";
import type { EnrollResult } from "./supabase-repository";

export type EnrollmentSnapshot = {
  courseIds: string[];
  ready: boolean;
  error: string | null;
};

const initial: EnrollmentSnapshot = { courseIds: [], ready: false, error: null };
let snapshot = initial;
let requestVersion = 0;
const listeners = new Set<() => void>();
const signalKey = "gradexa.v2.enrollments.refresh";
let channel: BroadcastChannel | null = null;
const emit = () => listeners.forEach((listener) => listener());

export async function refreshEnrollments(): Promise<EnrollmentSnapshot> {
  const version = ++requestVersion;
  try {
    const result = await readMyEnrollmentsAction();
    if (version !== requestVersion) return snapshot;
    if (!result.ok && snapshot.ready && !snapshot.error) {
      toast.error(result.message);
      return snapshot;
    }
    snapshot = result.ok
      ? { courseIds: result.courseIds, ready: true, error: null }
      : { courseIds: [], ready: true, error: result.message };
  } catch {
    if (version !== requestVersion) return snapshot;
    if (snapshot.ready && !snapshot.error) {
      toast.error("Kursga yozilishlarni yangilab bo‘lmadi. Internetni tekshiring.");
      return snapshot;
    }
    snapshot = {
      courseIds: [],
      ready: true,
      error: "Kursga yozilishlarni yuklab bo‘lmadi. Qayta urinib ko‘ring.",
    };
  }
  emit();
  return snapshot;
}

const reload = () => void refreshEnrollments();
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
      channel?.close();
      channel = null;
      ++requestVersion;
      snapshot = initial;
    }
  };
}

function announceChange() {
  if (channel) channel.postMessage("changed");
  else {
    try {
      window.localStorage.setItem(signalKey, String(Date.now()));
    } catch {
      // Focus refresh still reloads server data.
    }
  }
}

export function useEnrollments() {
  return useSyncExternalStore(subscribe, () => snapshot, () => initial);
}

export async function enrollInCourse(courseId: string): Promise<EnrollResult> {
  try {
    const result = await enrollInCourseAction(courseId);
    if (result.ok) {
      ++requestVersion;
      snapshot = {
        courseIds: [...new Set([...snapshot.courseIds, result.courseId])],
        ready: true,
        error: null,
      };
      emit();
      announceChange();
    }
    return result;
  } catch {
    return {
      ok: false,
      message: "Kursga yozilish javobi olinmadi. Qayta urinishdan oldin sahifani yangilang.",
    };
  }
}
