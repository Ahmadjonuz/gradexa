"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CourseForm } from "./course-form";
import { useCourses } from "./use-courses";
import { CourseLoading, StorageError } from "./course-shared";
import { AccountHeading } from "@/features/workspace/account-ui";

export function CourseCreate() {
  const router = useRouter();
  const [formStatus, setFormStatus] = useState({ busy: false, dirty: false });
  function mayLeave() {
    return !formStatus.busy && (!formStatus.dirty || window.confirm("Saqlanmagan o‘zgarishlar bor. Saqlamasdan chiqasizmi?"));
  }
  const { ready, error } = useCourses();
  if (!ready) return <CourseLoading />;
  return (
    <div className="ga-page gc-page">
      <Link href="/admin/courses" className="back-link" onClick={event => { if (!mayLeave()) event.preventDefault(); }}>
        <ArrowLeft size={16} />
        Kurslarga qaytish
      </Link>
      <AccountHeading title="Yangi kurs yaratish" subtitle="Bilimingizni yangi o‘quv dasturiga aylantiring." />
      {error ? (
        <StorageError message={error} />
      ) : (
        <section>
          <CourseForm
            onSaved={(course) => router.push(`/admin/courses/${course.id}`)}
            onCancel={() => { if (mayLeave()) router.push("/admin/courses"); }}
            onStateChange={setFormStatus}
          />
        </section>
      )}
    </div>
  );
}
