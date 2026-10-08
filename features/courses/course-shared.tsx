"use client";

import { AlertCircle, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from "@/components/ui/empty";
import { refreshCourses } from "./use-courses";
import { statusLabels, type CourseStatus } from "./model";

export function StatusBadge({ status }: { status: CourseStatus }) {
  return (
    <span className={`course-status-badge status-${status}`}>
      {statusLabels[status]}
    </span>
  );
}
export function LocalNotice() {
  return (
    <p className="local-notice">
      <AlertCircle size={16} />
      <span>
        Kurslar Supabase’da saqlanadi. O‘quv statistikasi akkauntlarga
        bog‘langan darslar, kursga yozilishlar va progressdan hisoblanadi.
      </span>
    </p>
  );
}
export function CourseLoading() {
  return (
    <div
      className="course-loading"
      role="status"
      aria-label="Kurslar yuklanmoqda"
    >
      <Skeleton className="h-10 w-48" />
      <div className="course-catalog-grid">
        {[1, 2, 3].map((id) => (
          <Skeleton key={id} className="h-72 w-full" />
        ))}
      </div>
      <span className="sr-only">Kurslar yuklanmoqda…</span>
    </div>
  );
}
export function StorageError({ message }: { message: string }) {
  return (
    <div className="storage-error" role="alert">
      <AlertCircle size={20} />
      <p>{message}</p>
      <Button variant="outline" onClick={refreshCourses}>
        Qayta urinish
      </Button>
    </div>
  );
}
export function CourseEmpty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <Empty className="panel border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BookOpen />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}
