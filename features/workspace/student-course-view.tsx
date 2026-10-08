"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Play, BookOpen, Clock3, Globe, Layers, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useWorkspace, refreshWorkspace } from "./store";
import { refreshLessons } from "@/features/lessons/use-lessons";
import { enrollInCourse } from "@/features/enrollments/use-enrollments";
import { studentProgress } from "./model";
import { levelLabels } from "@/features/courses/model";
import { courseCover } from "@/features/courses/course-art";
import { WorkspaceGate, CourseEmpty } from "./ui";
import { LessonCurriculum } from "./lesson-curriculum";
import { orderedLessons, lessonUnlocked, lessonGroups } from "./learning-model";
import { AccountPanel } from "./account-ui";
import { formatDate } from "./account-utils";
import { quizAvailability, recentAttempts } from "./study-flow";
import "@/features/courses/learning-pages.css";

export function StudentCourseView({ courseId }: { courseId: string }) {
  const w = useWorkspace(), c = w.courses.find(c => c.id === courseId && c.status === "published");
  const [enrolling, setEnrolling] = useState(false);
  const enrolled = !!w.student?.courseIds.includes(courseId);
  const lessons = orderedLessons(w.data.lessons.filter(l => l.courseId === courseId && l.published));
  const completed = w.data.completed[w.student?.id ?? ""] ?? [];
  const progress = studentProgress(w.data, w.student?.id ?? "", courseId);
  const next = lessons.find(l => !completed.includes(l.id) && lessonUnlocked(l.id, lessons, completed, c?.sequential)) ?? lessons[0];
  const attempts = recentAttempts(w.data.attempts.filter(a => a.studentId === w.student?.id && a.courseId === courseId));
  const quizzes = w.data.quizzes.filter(q => q.courseId === courseId && q.published);
  async function enroll() {
    if (enrolling) return;
    setEnrolling(true);
    const result = await enrollInCourse(courseId);
    if (!result.ok) toast.error(result.message);
    else {
      await Promise.all([refreshWorkspace(), refreshLessons()]);
      toast.success(result.alreadyEnrolled ? "Kursga yozilish yangilandi." : "Kursga yozildingiz.");
    }
    setEnrolling(false);
  }
  if (!c || w.student?.status !== "active") return <WorkspaceGate workspace={w}><CourseEmpty title="Kursni ochib bo‘lmadi" description="Kurs nashr qilingan, o‘quv profilingiz esa faol bo‘lishi kerak."><Button asChild><Link href="/student/courses">Kurslarga qaytish</Link></Button></CourseEmpty></WorkspaceGate>;
  return <WorkspaceGate workspace={w}><div className="ga-page gc-page"><Link href="/student/courses" className="ga-back"><ArrowLeft size={17} />Kurslarga qaytish</Link>
    <section className="gc-hero"><div className="gc-hero-copy"><p className="gc-eyebrow">{c.category} · {levelLabels[c.level]}</p><h1>{c.title}</h1><p>{c.description}</p><div className="gc-hero-progress"><div><span>{progress.completed}/{progress.total} dars yakunlandi</span><strong>{progress.percent}%</strong></div><Progress value={progress.percent} aria-label="Kurs progressi" /></div><div className="gc-hero-actions">{enrolled ? next ? <Button asChild><Link href={"/student/lessons/" + next.id}><Play size={17} />{progress.percent === 100 ? "Darslarni takrorlash" : progress.completed ? "Davom ettirish" : "O‘rganishni boshlash"}</Link></Button> : <span className="gc-count">Darslar tez orada qo‘shiladi.</span> : <Button disabled={enrolling} onClick={enroll}>{enrolling ? "Yozilmoqda…" : "Kursga yozilish"}</Button>}</div></div><img className="gc-hero-art" src={courseCover(c)} alt="" width="650" height="400" /></section>
    <div className="gc-content-grid"><section className="ga-panel"><div className="gc-section-heading"><h2>Kurs dasturi</h2><span>{lessonGroups(lessons).length} modul · {lessons.length} dars</span></div>{lessons.length ? <LessonCurriculum lessons={lessons} completed={completed} enrolled={enrolled} sequential={c.sequential} /> : <p className="gc-footnote">Bu kursga hali dars kiritilmagan.</p>}{c.sequential && <p className="gc-footnote">Keyingi dars avvalgi darslarni yakunlaganingizdan so‘ng ochiladi.</p>}</section>
    <aside className="gc-side-stack"><AccountPanel title="Kurs haqida"><dl className="gc-facts"><dt><BookOpen size={17} />Darslar soni</dt><dd>{lessons.length}</dd><dt><Clock3 size={17} />Davomiyligi</dt><dd>{lessons.reduce((sum, l) => sum + l.minutes, 0)} daqiqa</dd><dt><Layers size={17} />Daraja</dt><dd>{levelLabels[c.level]}</dd><dt><Globe size={17} />Til</dt><dd>{{ uz: "O‘zbekcha", en: "English", ru: "Русский" }[c.language ?? "uz"]}</dd></dl></AccountPanel>
      <AccountPanel title="Bilimni tekshirish">{quizzes.length ? quizzes.map(q => <div className="mb-5" key={q.id}><h3>{q.title}</h3><p>{q.questions.length} savol · o‘tish chegarasi {q.passScore}%</p>{enrolled ? quizAvailability(q, w.courses, w.student, w.data.attempts).canStart ? <Button asChild variant="outline" className="w-full"><Link href={"/student/quizzes/" + q.id}>Testni boshlash</Link></Button> : <><p>Bu testni hozir topshirib bo‘lmaydi yoki urinishlar tugagan.</p><Button asChild variant="outline" className="w-full"><Link href={"/student/results?quiz=" + encodeURIComponent(q.id)}>Natijalarni ko‘rish</Link></Button></> : <p>Test uchun avval kursga yoziling.</p>}</div>) : <p>Bu kurs uchun test hali qo‘shilmagan.</p>}</AccountPanel>
      <AccountPanel title="So‘nggi natijangiz">{attempts[0] ? <><Trophy className="ga-gold mb-3" /><h3>{attempts[0].score}% · {attempts[0].title}</h3><p>{formatDate(attempts[0].createdAt)}</p><Button variant="outline" asChild><Link href={"/student/results/" + attempts[0].id}>Javoblar tahlili</Link></Button></> : <p>Test topshirgach, ball va javoblar tahlili shu yerda ko‘rinadi.</p>}</AccountPanel>
    </aside></div><p className="ga-footnote">Kursga yozilish va dars progressi akkauntingizda saqlanadi.</p>
  </div></WorkspaceGate>;
}
