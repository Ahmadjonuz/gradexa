"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type RouteErrorProps = { error: Error & { digest?: string }; reset: () => void };

export function RouteError({ error, reset, home = "/" }: RouteErrorProps & { home?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Never render raw exception messages: they can contain URLs or credentials.
  const reference = /^[a-zA-Z0-9_-]{1,80}$/.test(error.digest ?? "") ? error.digest : undefined;
  return <section role="alert" className="mx-auto my-12 max-w-xl rounded-xl border border-border bg-card p-6 text-card-foreground sm:p-8">
    <AlertCircle className="mb-4 text-destructive" size={30} />
    <h1 className="text-2xl font-semibold">Sahifani ochib bo‘lmadi</h1>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">Internet aloqasini tekshirib, qayta urinib ko‘ring. Xato saqlanib qolsa, administratorga qaysi sahifada yuz berganini ayting.</p>
    {reference && <p className="mt-3 break-all text-xs text-muted-foreground">Xato kodi: {reference}</p>}
    <div className="mt-6 flex flex-wrap gap-3">
      <Button disabled={pending} onClick={() => startTransition(() => { router.refresh(); reset(); })}><RefreshCw size={16} />{pending ? "Yuklanmoqda…" : "Qayta urinish"}</Button>
      <Button asChild variant="outline"><Link href={home}>Bosh sahifaga qaytish</Link></Button>
    </div>
  </section>;
}
