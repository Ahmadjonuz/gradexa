"use client";
import Link from "next/link";
import { Fragment, useState } from "react";
import { ArrowLeft, ArrowRight, Award, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Download, ListChecks, RotateCcw, Users, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useWorkspace } from "./store";
import { WorkspaceGate, CourseEmpty, Choice } from "./ui";
import { AccountHeading, AccountPanel, ScoreRing, StatusPill } from "./account-ui";
import { answerCounts, downloadResults, formatDate, initials } from "./account-utils";
import type { Attempt } from "./model";
import { filterResults, quizAvailability, recentAttempts, resultPage } from "./study-flow";
import "@/features/courses/learning-pages.css";

function AttemptSummary({ attempt }: { attempt: Attempt }) {
  const counts = answerCounts(attempt);
  return <div className="ga-answer-summary">{[["To‘g‘ri", counts.correct, "correct"], ["Noto‘g‘ri", counts.incorrect, "incorrect"], ["Javobsiz", counts.unanswered, "empty"]].map(([label, count, className]) => <div key={label} className={String(className)}><span>{label}</span><strong>{count}</strong><div className="ga-progress"><i style={{ width: (counts.total ? Number(count) / counts.total * 100 : 0) + "%" }} /></div></div>)}</div>;
}

export function Results({ student = false, initialQuiz = "all" }: { student?: boolean; initialQuiz?: string }) {
  const w = useWorkspace();
  const [status, setStatus] = useState("all"), [quiz, setQuiz] = useState(initialQuiz), [course, setCourse] = useState("all"), [since, setSince] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  function resetPage() { setPage(1); setSelected(null); }
  const base = w.data.attempts.filter(a => !student || a.studentId === w.student?.id);
  const courseNames = Object.fromEntries(w.courses.map(c => [c.id, c.title]));
  const list = filterResults(base, { course, quiz, since, status });
  const pagination = resultPage(list, page);
  const passed = list.filter(a => a.score >= a.passScore).length;
  const average = list.length ? Math.round(list.reduce((sum, a) => sum + a.score, 0) / list.length) : 0;
  const quizOptions = Array.from(new Map<string, string>([
    ...(!student ? w.data.quizzes.filter(q => course === "all" || q.courseId === course).map(q => [q.id, q.title] as const) : []),
    ...base.filter(a => course === "all" || a.courseId === course).map(a => [a.quizId, a.title] as const),
  ]).entries());
  const root = student ? "/student/results" : "/admin/quiz-results";
  return <WorkspaceGate workspace={w}><div className="ga-page">
    <AccountHeading title={student ? "Mening natijalarim" : "Test natijalari"} subtitle={student ? "Har bir urinish — keyingi yutuq sari bir qadam." : "Talabalarning test natijalari va javoblar tahlili."} />
    <div className="ga-filters">
      <Choice label="Kurs" value={course} onChange={value => { setCourse(value); setQuiz("all"); resetPage(); }} items={[{ value: "all", label: "Barcha kurslar" }, ...Array.from(new Set(base.map(a => a.courseId))).map(id => ({ value: id, label: courseNames[id] ?? "Arxivlangan kurs" }))]} />
      <Choice label="Test" value={quiz} onChange={value => { setQuiz(value); resetPage(); }} items={[{ value: "all", label: "Barcha testlar" }, ...quizOptions.map(([value, label]) => ({ value, label }))]} />
      <Choice label="Natija" value={status} onChange={value => { setStatus(value); resetPage(); }} items={[{ value: "all", label: "Barchasi" }, { value: "passed", label: "O‘tgan" }, { value: "failed", label: "O‘tmagan" }]} />
      <label>Sanadan boshlab (Toshkent)<input type="date" value={since} onChange={e => { setSince(e.target.value); resetPage(); }} /></label>
      <Button onClick={() => downloadResults(list, courseNames)} disabled={!list.length}><Download size={17} />Eksport</Button>
    </div>
    <div className="ga-metrics ga-metrics-three">
      <AccountPanel><span className="ga-metric-icon"><ListChecks /></span><div><span>Jami urinishlar</span><strong>{list.length}</strong><small>Tanlangan filtrlar bo‘yicha</small></div></AccountPanel>
      <AccountPanel><ScoreRing score={average} label="O‘rtacha natija" /><div><span>O‘rtacha natija</span><strong>{list.length ? average + "%" : "—"}</strong><small>{list.length ? "Barcha tanlangan urinishlar" : "Hali natija yo‘q"}</small></div></AccountPanel>
      <AccountPanel><span className="ga-metric-icon"><Award /></span><div><span>Muvaffaqiyatli urinishlar</span><strong>{passed}<small> / {list.length}</small></strong><small>{list.length ? Math.round(passed / list.length * 100) + "% o‘tish darajasi" : "Natijalar shu yerda ko‘rinadi"}</small></div></AccountPanel>
    </div>
    <AccountPanel title={student ? "Testlar tarixi" : "Barcha natijalar"} action={<span className="ga-muted">{list.length} ta urinish</span>}>
      {list.length ? <Table className="ga-results-table"><TableHeader><TableRow>{!student && <TableHead>Talaba</TableHead>}<TableHead>Kurs / test</TableHead><TableHead>To‘g‘ri</TableHead><TableHead>Natija</TableHead><TableHead>Holat</TableHead><TableHead>Sana</TableHead><TableHead><span className="sr-only">Tahlilni ochish</span></TableHead></TableRow></TableHeader><TableBody>{pagination.items.map(a => <Fragment key={a.id}><TableRow className={selected === a.id ? "ga-row-selected" : ""}>
        {!student && <TableCell><div className="ga-person"><span className="ga-avatar ga-avatar-small">{initials(a.studentName)}</span><strong>{a.studentName}</strong></div></TableCell>}
        <TableCell><strong>{courseNames[a.courseId] ?? "Arxivlangan kurs"}</strong><small>{a.title}</small></TableCell><TableCell>{answerCounts(a).correct}/{a.questions.length}</TableCell><TableCell><b className="ga-green">{a.score}%</b></TableCell><TableCell><StatusPill passed={a.score >= a.passScore} /></TableCell><TableCell>{formatDate(a.createdAt)}</TableCell>
        <TableCell><button className="ga-expand" aria-label={a.studentName + ": " + a.title + " tafsilotlari"} aria-expanded={selected === a.id} aria-controls={"attempt-" + a.id} onClick={() => setSelected(selected === a.id ? null : a.id)}><ChevronDown /></button></TableCell>
      </TableRow>{selected === a.id && <TableRow><TableCell colSpan={student ? 6 : 7}><div className="ga-attempt-expanded" id={"attempt-" + a.id}><div className="ga-panel-heading"><div><h3>{a.studentName} · {a.title}</h3><p>{formatDate(a.createdAt, true)} · Toshkent vaqti</p></div><Button asChild variant="outline"><Link href={root + "/" + a.id}>Batafsil tahlil<ArrowRight size={16} /></Link></Button></div><AttemptSummary attempt={a} /></div></TableCell></TableRow>}</Fragment>)}</TableBody></Table> : <div className="ga-empty"><Users /><h3>{base.length ? "Filtrga mos natija topilmadi" : "Natijalar hali mavjud emas"}</h3><p>{base.length ? "Boshqa kurs, test yoki sanani tanlang." : "Test topshirilgach, ball va javoblar tahlili shu yerda paydo bo‘ladi."}</p>{base.length ? <Button variant="outline" onClick={() => { setCourse("all"); setQuiz("all"); setStatus("all"); setSince(""); resetPage(); }}>Filtrlarni tozalash</Button> : <Button asChild variant="outline"><Link href={student ? "/student/quizzes" : "/admin/quizzes"}>Testlarga o‘tish<ArrowRight size={16} /></Link></Button>}</div>}
      {list.length > 0 && <nav className="gc-pagination" aria-label="Natijalar sahifalari"><span role="status">{pagination.first}–{pagination.last} / {list.length} ta urinish</span><div className="flex items-center gap-3"><Button variant="outline" size="icon" aria-label="Oldingi natijalar sahifasi" disabled={pagination.page === 1} onClick={() => { setPage(pagination.page - 1); setSelected(null); }}><ChevronLeft size={17} /></Button><span aria-current="page">{pagination.page} / {pagination.pages}</span><Button variant="outline" size="icon" aria-label="Keyingi natijalar sahifasi" disabled={pagination.page === pagination.pages} onClick={() => { setPage(pagination.page + 1); setSelected(null); }}><ChevronRight size={17} /></Button></div></nav>}
    </AccountPanel><p className="ga-footnote">Natijalar Supabase’da saqlanadi. Sana va filtrlar Toshkent vaqtida. Eksport barcha filtrlangan urinishlarni qamrab oladi.</p>
  </div></WorkspaceGate>;
}

export function ResultDetail({ attemptId, student = false }: { attemptId: string; student?: boolean }) {
  const w = useWorkspace();
  const [filter, setFilter] = useState("all");
  const a = w.data.attempts.find(item => item.id === attemptId && (!student || item.studentId === w.student?.id));
  const root = student ? "/student" : "/admin";
  if (!a) return <WorkspaceGate workspace={w}><CourseEmpty title="Natija topilmadi" description="Bu profil uchun urinish mavjud emas."><Button asChild><Link href={student ? "/student/results" : "/admin/quiz-results"}>Natijalarga qaytish</Link></Button></CourseEmpty></WorkspaceGate>;
  const counts = answerCounts(a), passed = a.score >= a.passScore;
  const currentQuiz = w.data.quizzes.find(item => item.id === a.quizId && item.published);
  const retakeAvailable = quizAvailability(currentQuiz, w.courses, w.student, w.data.attempts).canStart;
  const attemptNumber = recentAttempts(w.data.attempts.filter(item => item.studentId === a.studentId && item.quizId === a.quizId)).reverse().findIndex(item => item.id === a.id) + 1;
  const courseAvailable = w.courses.some(course => course.id === a.courseId && (!student || (course.status === "published" && w.student?.courseIds.includes(course.id))));
  const answers = a.questions.map((q, i) => ({ q, i, correct: a.answers[i] === q.correct })).filter(({ correct }) => filter === "all" || (filter === "correct" ? correct : !correct));
  return <WorkspaceGate workspace={w}><div className="ga-page">
    <Link className="ga-back" href={student ? "/student/results" : "/admin/quiz-results"}><ArrowLeft size={17} />Natijalarga qaytish</Link>
    <section className="ga-result-hero"><img src="/images/gradexa/learning-hero.png" alt="" width="240" height="180" /><div><span className="ga-eyebrow">TEST YAKUNLANDI</span><h1>{passed ? "Test muvaffaqiyatli yakunlandi" : "Keyingi natija yanada yaxshi bo‘ladi"}</h1><p>{a.title} · {a.studentName}</p></div><div className="ga-hero-actions"><Button asChild><Link href={courseAvailable ? root + "/courses/" + a.courseId : root + "/courses"}>{courseAvailable ? "Kursga qaytish" : "Kurslar ro‘yxati"}<ArrowRight size={16} /></Link></Button>{student && retakeAvailable && <Button asChild variant="outline"><Link href={"/student/quizzes/" + a.quizId}><RotateCcw size={16} />Qayta topshirish</Link></Button>}</div></section>
    <div className="ga-result-stats"><AccountPanel className="ga-result-score-card"><ScoreRing score={a.score} /><div><strong>{counts.correct}<small> / {counts.total}</small></strong><span>To‘g‘ri javoblar</span></div></AccountPanel><AccountPanel><XCircle className="ga-red" /><strong>{counts.incorrect}</strong><span>Noto‘g‘ri javoblar</span>{counts.unanswered > 0 && <small>{counts.unanswered} ta javobsiz</small>}</AccountPanel><AccountPanel><Award className="ga-gold" /><strong>{a.passScore}%</strong><span>O‘tish chegarasi</span><StatusPill passed={passed} /></AccountPanel><AccountPanel><ListChecks className="ga-green" /><strong>{attemptNumber}{currentQuiz ? ` / ${currentQuiz.maxAttempts ?? 3}` : ""}</strong><span>{currentQuiz ? "Urinishlar soni" : "Urinish tartibi"}</span></AccountPanel><AccountPanel><CalendarDays className="ga-green" /><strong className="ga-result-date">{formatDate(a.createdAt)}</strong><span>Topshirilgan sana</span></AccountPanel></div>
    <AccountPanel title="Javoblar tahlili" action={<div className="ga-segmented" role="group" aria-label="Javoblarni filtrlash">{[["all", "Barchasi"], ["correct", "To‘g‘ri"], ["incorrect", "Xatolar"]].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>}>
      <div className="ga-review-list">{answers.map(({ q, i, correct }) => <details className="ga-question" key={q.id} open={i < 2}><summary>{correct ? <CheckCircle2 className="ga-green" /> : <XCircle className="ga-red" />}<strong>{i + 1}. {q.text}</strong><span className={"ga-pill " + (correct ? "is-good" : "is-bad")}>{correct ? "To‘g‘ri" : "Xato / javobsiz"}</span><ChevronDown className="ga-question-chevron" /></summary><div className="ga-question-body"><div className="ga-options">{q.options.map((option, index) => <div key={index} className={index === q.correct ? "is-correct" : index === a.answers[i] ? "is-incorrect" : ""}><span>{String.fromCharCode(65 + index)}</span><p>{option}</p>{index === q.correct ? <CheckCircle2 size={18} /> : index === a.answers[i] ? <X size={18} /> : null}{(index === q.correct || index === a.answers[i]) && <small>{index === q.correct ? "To‘g‘ri javob" : "Sizning javobingiz"}{index === q.correct && index === a.answers[i] && " · Sizning javobingiz"}</small>}</div>)}</div><aside><h3>Izoh</h3><p>{q.explanation || "Ushbu savol uchun izoh kiritilmagan."}</p>{!q.options[a.answers[i]] && <p className="ga-red">Bu savolga javob berilmagan.</p>}</aside></div></details>)}{!answers.length && <p className="ga-empty">Bu turdagi javoblar yo‘q.</p>}</div>
    </AccountPanel><p className="ga-footnote">Savollar topshirilgan vaqtdagi holatda saqlangan. Keyingi tahrirlar bu natijani o‘zgartirmaydi.</p>
  </div></WorkspaceGate>;
}
