"use client";

import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import type { Lesson } from "@/features/workspace/model";
import {
  readLessonsAction,
  saveLessonAction,
} from "./actions";
import type { LessonSaveResult } from "./supabase-repository";

export type LessonSnapshot = {
  lessons: Lesson[];
  ready: boolean;
  error: string | null;
};

const initial: LessonSnapshot = { lessons: [], ready: false, error: null };
let snapshot = initial;
let requestVersion = 0;
const listeners = new Set<() => void>();
const signalKey = "gradexa.v2.lessons.refresh";
let channel: BroadcastChannel | null = null;
const emit = () => listeners.forEach((listener) => listener());

export async function refreshLessons(): Promise<LessonSnapshot> {
  const version = ++requestVersion;
  try {
    const result = await readLessonsAction();
    if (version !== requestVersion) return snapshot;
    if (!result.ok && snapshot.ready && !snapshot.error) {
      toast.error(result.message);
      return snapshot;
    }
    snapshot = result.ok
      ? { lessons: result.lessons, ready: true, error: null }
      : { lessons: [], ready: true, error: result.message };
  } catch {
    if (version !== requestVersion) return snapshot;
    if (snapshot.ready && !snapshot.error) {
      toast.error(
        "Darslar ro‘yxatini yangilab bo‘lmadi. Internetni tekshiring.",
      );
      return snapshot;
    }
    snapshot = {
      lessons: [],
      ready: true,
      error: "Darslarni yuklab bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.",
    };
  }
  emit();
  return snapshot;
}

const reload = () => {
  void refreshLessons();
};

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

export function announceLessonChange() {
  if (channel) channel.postMessage("changed");
  else {
    try {
      window.localStorage.setItem(signalKey, String(Date.now()));
    } catch {
      // Focus and an explicit retry still fetch current server data.
    }
  }
}

export function useLessons() {
  return useSyncExternalStore(subscribe, () => snapshot, () => initial);
}

export async function saveLesson(
  lesson: Lesson,
  existing?: { id: string; updatedAt: string },
): Promise<LessonSaveResult> {
  try {
    const result = await saveLessonAction(lesson, existing);
    if (result.ok) {
      ++requestVersion;
      snapshot = {
        lessons: [
          result.lesson,
          ...snapshot.lessons.filter((item) => item.id !== result.lesson.id),
        ],
        ready: true,
        error: null,
      };
      emit();
      announceLessonChange();
    }
    return result;
  } catch {
    return {
      ok: false,
      message:
        "Saqlash javobi olinmadi. Qayta saqlashdan oldin darslar ro‘yxatini tekshiring.",
    };
  }
}
