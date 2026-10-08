"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, PlayCircle, Clock3, ExternalLink, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useWorkspace, saveWorkspace } from "./store";
import { WorkspaceGate, CourseEmpty, saved } from "./ui";
import { orderedLessons, lessonUnlocked, videoSource } from "./learning-model";
import { LessonCurriculum } from "./lesson-curriculum";
import { AccountPanel } from "./account-ui";
import "@/features/courses/learning-pages.css";

export function LessonReader({ lessonId, admin = false }: { lessonId: string; admin?: boolean }) {
  const [saving, setSaving] = useState(false);
  const w = useWorkspace(), lesson = w.data.lessons.find(l => l.id === lessonId && (admin || l.published));
  const course = w.courses.find(c => c.id === lesson?.courseId && (admin || c.status === "published"));
  const siblings = orderedLessons(w.data.lessons.filter(l => l.courseId === course?.id && (admin || l.published)));
  const completed = w.data.completed[w.student?.id ?? ""] ?? [], complete = completed.includes(lessonId);
  const enrolled = w.student?.status === "active" && w.student.courseIds.includes(course?.id ?? "");
  const unlocked = lessonUnlocked(lessonId, siblings, completed, course?.sequential);
  const allowed = admin || (enrolled && unlocked);
  const index = siblings.findIndex(l => l.id === lessonId), previous = siblings[index - 1], next = siblings[index + 1];
  const progress = siblings.length ? Math.round(siblings.filter(l => completed.includes(l.id)).length / siblings.length * 100) : 0;
  const nextAllowed = admin || (next && lessonUnlocked(next.id, siblings, completed, course?.sequential));
  const quizzes = w.data.quizzes.filter(q => q.courseId === course?.id && q.published);
  if (!lesson || !course || !allowed) return <WorkspaceGate workspace={w}><CourseEmpty title={enrolled && !unlocked ? "Avvalgi darslarni yakunlang" : "Darsni ochib bo‘lmadi"} description={enrolled && !unlocked ? "Bu kurs darslari ketma-ket ochiladi. Kurs dasturidan navbatdagi darsni tanlang." : "Faol o‘quv profili va kursga yozilish talab etiladi."}><Button asChild><Link href={admin ? "/admin/lessons" : course ? "/student/courses/" + course.id : "/student/courses"}>Kurs dasturiga qaytish</Link></Button></CourseEmpty></WorkspaceGate>;
  const root = admin ? "/admin/lessons/" : "/student/lessons/";
  async function markComplete() {
    if (saving) return;
    setSaving(true);
    saved(await saveWorkspace("completion", { lessonId, completed: !complete }));
    setSaving(false);
  }
  return <WorkspaceGate workspace={w}><div className="ga-page gc-page"><Link className="ga-back" href={(admin ? "/admin/courses/" : "/student/courses/") + course.id}><ArrowLeft size={17} />{course.title}</Link>
    <div className="gc-reader"><div><VideoPanel key={lesson.videoUrl} url={lesson.videoUrl} title={lesson.title} /><header className="gc-lesson-heading"><h1>{lesson.title}</h1><p><Clock3 size={16} />{lesson.minutes} daqiqa<span>· {lesson.module}</span>{complete && <span className="ga-green">Yakunlangan</span>}</p></header>
    <Tabs defaultValue="description" className="gc-reader-tabs" key={lessonId}><TabsList aria-label="Dars bo‘limlari"><TabsTrigger value="description">Tavsif</TabsTrigger><TabsTrigger value="materials">Materiallar</TabsTrigger>{!admin && <TabsTrigger value="notes">Qaydlarim</TabsTrigger>}</TabsList>
      <TabsContent value="description"><article className="gc-reader-body">{lesson.body.split(/\n\s*\n/).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</article></TabsContent>
      <TabsContent value="materials"><div className="gc-reader-body"><h2 className="section-title mb-4">Dars manbalari</h2>{videoSource(lesson.videoUrl) ? <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer" className="gc-lesson-row"><PlayCircle size={18} /><span>Video manbasini ochish</span><ExternalLink size={16} /></a> : null}<button className="gc-lesson-row w-full text-left" onClick={() => {
        const blob = new Blob([lesson.title + "\n\n" + lesson.body], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url; a.download = "gradexa-dars-" + lesson.id + ".txt"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}><FileText size={18} /><span>Dars matnini yuklab olish</span><ArrowRight size={16} /></button><p className="gc-footnote">Ushbu dars uchun mavjud materiallar.</p></div></TabsContent>
      {!admin && <TabsContent value="notes"><LessonNotes key={w.student?.id + lessonId} lessonId={lessonId} initial={w.data.notes[w.student?.id + ":" + lessonId] ?? ""} /></TabsContent>}
    </Tabs>
    <div className="gc-reader-actions">{previous && <Button variant="outline" asChild><Link href={root + previous.id}><ArrowLeft size={16} />Oldingi dars</Link></Button>}{!admin && <Button variant={complete ? "outline" : "default"} disabled={saving} onClick={markComplete}><CheckCircle2 size={17} />{complete ? "Yakunlangan · bekor qilish" : "Darsni yakunlash"}</Button>}{next && (nextAllowed ? <Button variant="outline" asChild><Link href={root + next.id}>Keyingi dars<ArrowRight size={16} /></Link></Button> : <Button variant="outline" disabled title="Avval bu darsni yakunlang">Keyingi dars<ArrowRight size={16} /></Button>)}</div>{!admin && <p className="ga-footnote">O‘qib bo‘lgach, darsni yakunlang. Qaydlar va progress akkauntingizda saqlanadi.</p>}
    </div><aside className="gc-reader-side"><AccountPanel title="Kurs dasturi"><p className="gc-count">{siblings.filter(l => completed.includes(l.id)).length}/{siblings.length} dars yakunlangan · {progress}%</p><Progress value={progress} aria-label="Kurs progressi" /><LessonCurriculum lessons={siblings} completed={completed} currentId={lessonId} sequential={course.sequential} admin={admin} />{!admin && quizzes.map(q => <Button key={q.id} variant="outline" className="w-full mt-3" asChild><Link href={"/student/quizzes/" + q.id}>{q.title}<ArrowRight size={16} /></Link></Button>)}</AccountPanel></aside></div>
  </div></WorkspaceGate>;
}
function LessonNotes({ lessonId, initial }: { lessonId: string; initial: string }) {
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(initial), [message, setMessage] = useState("");
  return <section className="gc-reader-body"><label htmlFor="lesson-note">Muhim fikrlarni yozib boring</label><Textarea disabled={saving} id="lesson-note" maxLength={10000} rows={7} value={note} onChange={e => { setNote(e.target.value); setMessage(""); }} placeholder="Bugun nimalarni o‘rgandingiz?" /><Button variant="outline" disabled={saving} onClick={async () => {
    if (saving) return; setSaving(true);
    if (saved(await saveWorkspace("note", { lessonId, note }))) setMessage("Qayd saqlandi.");
    setSaving(false);
  }}><Save size={16} />Qaydni saqlash</Button><span role="status" className="ga-green ml-4">{message}</span></section>;
}
function VideoPanel({ url, title }: { url: string; title: string }) {
  const source = videoSource(url), [failed, setFailed] = useState(false);
  return <div className="gc-video">{source?.type === "youtube" ? <iframe src={source.src} title={title + " — video"} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : source?.type === "file" && !failed ? <video controls playsInline preload="metadata" src={source.src} onError={() => setFailed(true)} aria-label={title}>Brauzeringiz videoni qo‘llamaydi.</video> : <div className="gc-video-empty"><PlayCircle /><h2>{failed ? "Video yuklanmadi" : source ? "Tashqi video manbasi" : "Dars matni bilan tanishing"}</h2><p>{source ? "Video manbasini alohida oynada ochishingiz mumkin." : "Bu darsga video hali biriktirilmagan. Asosiy material quyidagi tavsifda."}</p>{source && <Button variant="outline" asChild><a href={source.src} target="_blank" rel="noopener noreferrer">Videoni ochish<ExternalLink size={16} /></a></Button>}</div>}</div>;
}
