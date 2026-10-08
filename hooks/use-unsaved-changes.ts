"use client";
import { useEffect } from "react";

// Protect refresh/tab-close and explicit Cancel/Back controls. This is not a
// global Next router blocker and does not store drafts in localStorage.
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return () => !dirty || window.confirm("Saqlanmagan o‘zgarishlar bor. Ularni saqlamasdan chiqasizmi?");
}
