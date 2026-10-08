import { Skeleton } from "@/components/ui/skeleton";

export function RouteLoading() {
  return <section className="mx-auto w-full max-w-7xl space-y-6 p-6" role="status" aria-label="Sahifa yuklanmoqda" aria-busy="true">
    <span className="sr-only">Sahifa yuklanmoqda. Iltimos, kuting…</span>
    <Skeleton className="h-9 w-52" />
    <Skeleton className="h-4 w-full max-w-sm" />
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(id => <Skeleton key={id} className="h-56 w-full rounded-xl" />)}</div>
  </section>;
}
