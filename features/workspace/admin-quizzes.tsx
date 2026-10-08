"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Plus, ArrowLeft, ClipboardList, Trash2, PlayCircle, FileText, Search, Eye, Pencil, MoreHorizontal, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { quizSchema, type Quiz, type QuizView } from "./model";
import { useWorkspace, saveWorkspace, type Workspace } from "./store";
import { WorkspaceGate, Choice, CourseEmpty, saved } from "./ui";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { DeleteRecordButton } from "@/features/deletions/delete-record-button";
import "./quiz-pages.css";
import { WorkspaceMigration } from "./workspace-migration";
export function AdminQuizzes() {
  const w = useWorkspace();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [course, setCourse] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const list = w.data.quizzes.filter(
    (q) =>
      (course === "all" || q.courseId === course) &&
      (status === "all" || (status === "published") === q.published) &&
      q.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const published = w.data.quizzes.filter(q => q.published).length;
  const publishedPercent = w.data.quizzes.length ? Math.round(published / w.data.quizzes.length * 100) : 0;
  const draftPercent = w.data.quizzes.length ? 100 - publishedPercent : 0;
  const pages = Math.max(1, Math.ceil(list.length / 8));
  const currentPage = Math.min(page, pages);
  const visible = list.slice((currentPage - 1) * 8, currentPage * 8);
  async function togglePublished(id: string) {
    const quiz = w.data.quizzes.find(item => item.id === id);
    if (!quiz || busy) return;
    setBusy(true);
    saved(await saveWorkspace("quiz", { ...quiz, published: !quiz.published }));
    setBusy(false);
  }
  async function duplicate(quiz: QuizView) {
    if (busy) return;
    setBusy(true);
    const id = crypto.randomUUID();
    const result = await saveWorkspace("quiz", {
      ...quiz, id, revision: undefined, title: quiz.title.slice(0, 112) + " (nusxa)", published: false,
      questions: quiz.questions.map(question => ({ ...question, id: crypto.randomUUID() })),
    });
    setBusy(false);
    if (saved(result)) router.push(`/admin/quizzes/${id}`);
  }
  return (
    <WorkspaceGate workspace={w}>
      <div className="gq-page">
        <WorkspaceMigration quizzes={w.data.quizzes} />
        <header className="gq-heading"><div><h1>Testlar</h1><p>Testlar yarating, savollarni boshqaring va natijalarni kuzatib boring.</p></div><Button asChild><Link href="/admin/quizzes/new"><Plus size={19} />Yangi test</Link></Button></header>
        <div className="gq-toolbar">
          <label className="gq-search"><Search size={19} /><Input aria-label="Testlarni qidirish" placeholder="Testlarni qidirish..." value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /></label>
          <Choice label="Kurs bo‘yicha" value={course} onChange={value => { setCourse(value); setPage(1); }} items={[{ value: "all", label: "Barcha kurslar" }, ...w.courses.map(item => ({ value: item.id, label: item.title }))]} />
          <Choice label="Holat bo‘yicha" value={status} onChange={value => { setStatus(value); setPage(1); }} items={[{ value: "all", label: "Barcha holatlar" }, { value: "published", label: "Nashr qilingan" }, { value: "draft", label: "Qoralama" }]} />
        </div>
        <div className="gq-stats">
          <div className="gq-stat"><span className="gq-stat-icon"><ClipboardList /></span><div className="gq-stat-content"><span>Jami testlar</span><strong>{w.data.quizzes.length}</strong></div></div>
          <div className="gq-stat"><span className="gq-stat-icon"><PlayCircle /></span><div className="gq-stat-content"><span>Nashr qilingan</span><div className="gq-stat-reading"><strong>{published}</strong><small>{publishedPercent}%</small></div><span className="gq-stat-progress"><i style={{ width: `${publishedPercent}%` }} /></span></div></div>
          <div className="gq-stat"><span className="gq-stat-icon"><FileText /></span><div className="gq-stat-content"><span>Qoralamalar</span><div className="gq-stat-reading"><strong>{w.data.quizzes.length - published}</strong><small>{draftPercent}%</small></div><span className="gq-stat-progress"><i style={{ width: `${draftPercent}%` }} /></span></div></div>
        </div>
        <section className="gq-table-panel" aria-label="Testlar ro‘yxati">
          {list.length ? <><div className="gq-table-scroll"><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Test nomi</TableHead><TableHead>Kurs</TableHead><TableHead>Savollar</TableHead><TableHead>O‘tish bali</TableHead><TableHead>Urinishlar</TableHead><TableHead>Holat</TableHead><TableHead>Amallar</TableHead></TableRow></TableHeader><TableBody>{visible.map((quiz, index) => <TableRow key={quiz.id}>
            <TableCell>{(currentPage - 1) * 8 + index + 1}</TableCell>
            <TableCell><Link className="gq-row-title" href={`/admin/quizzes/${quiz.id}`}>{quiz.title}</Link></TableCell>
            <TableCell>{w.courses.find(item => item.id === quiz.courseId)?.title ?? "Kurs topilmadi"}</TableCell>
            <TableCell>{quiz.questions.length}</TableCell><TableCell>{quiz.passScore}%</TableCell><TableCell>{quiz.maxAttempts ?? 3}</TableCell>
            <TableCell><span className={`gq-status ${quiz.published ? "is-published" : "is-draft"}`}>{quiz.published ? "Nashr qilingan" : "Qoralama"}</span></TableCell>
            <TableCell><div className="gq-actions"><Button asChild variant="ghost" size="icon" title="Natijalarni ko‘rish"><Link aria-label={`${quiz.title} natijalari`} href={`/admin/quiz-results?quiz=${encodeURIComponent(quiz.id)}`}><Eye size={18} /></Link></Button><Button asChild variant="ghost" size="icon" title="Testni tahrirlash"><Link aria-label={`${quiz.title}ni tahrirlash`} href={`/admin/quizzes/${quiz.id}`}><Pencil size={18} /></Link></Button><DropdownMenu><DropdownMenuTrigger className="gq-menu-trigger" aria-label={`${quiz.title} amallari`}><MoreHorizontal size={19} /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={busy} onClick={() => togglePublished(quiz.id)}>{quiz.published ? "Qoralamaga o‘tkazish" : "Nashr qilish"}</DropdownMenuItem><DropdownMenuItem disabled={busy} onClick={() => duplicate(quiz)}>Nusxa yaratish</DropdownMenuItem></DropdownMenuContent></DropdownMenu><DeleteRecordButton kind="quiz" id={quiz.id} name={quiz.title} compact disabled={busy} /></div></TableCell>
          </TableRow>)}</TableBody></Table></div><footer className="gq-pagination"><span>{(currentPage - 1) * 8 + 1}–{Math.min(currentPage * 8, list.length)} / {list.length} ta test</span><div><Button variant="outline" size="icon" aria-label="Oldingi sahifa" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={18} /></Button><span aria-current="page">{currentPage} / {pages}</span><Button variant="outline" size="icon" aria-label="Keyingi sahifa" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={18} /></Button></div></footer></> : <CourseEmpty title="Test topilmadi" description="Filtrlarni o‘zgartiring yoki yangi test yarating."><Button variant="outline" onClick={() => { setQuery(""); setCourse("all"); setStatus("all"); setPage(1); }}>Filtrlarni tozalash</Button></CourseEmpty>}
        </section>
        <div className="gq-banner"><div><h2>Yaxshi testlar, kuchli natijalar</h2><p>Sifatli testlar bilan o‘quvchilarning bilimini aniq baholang.</p></div><Link href="/admin/quizzes/new">Test yaratishni boshlash <ArrowRight size={16} /></Link></div>
      </div>
    </WorkspaceGate>
  );
}
export function QuizEditor({ quizId }: { quizId?: string }) {
  const w = useWorkspace();
  const parsed = quizSchema.safeParse(w.data.quizzes.find((q) => q.id === quizId));
  const existing = parsed.success ? parsed.data : undefined;
  return (
    <WorkspaceGate workspace={w}>
      {quizId && !existing ? (
        <CourseEmpty
          title="Test topilmadi"
          description="Testlar ro‘yxatiga qayting."
        >
          <Button asChild>
            <Link href="/admin/quizzes">Testlar</Link>
          </Button>
        </CourseEmpty>
      ) : w.courses.length ? (
        <QuizEditorForm key={quizId ?? "new"} w={w} initial={existing} />
      ) : (
        <CourseEmpty
          title="Avval kurs yarating"
          description="Test kursga biriktiriladi."
        >
          <Button asChild>
            <Link href="/admin/courses/new">Kurs yaratish</Link>
          </Button>
        </CourseEmpty>
      )}
    </WorkspaceGate>
  );
}
function QuizEditorForm({ w, initial }: { w: Workspace; initial?: Quiz }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const pendingQuizId = useRef<string | null>(null);
  const pending = useRef(false);
  const [quiz, setQuiz] = useState<Quiz>(
    () =>
      initial ?? {
        id: "pending-quiz",
        courseId: w.courses[0].id,
        title: "",
        passScore: 70,
        maxAttempts: 3,
        published: false,
        questions: [
          {
            id: "pending-question",
            text: "",
            options: ["", "", "", ""],
            correct: -1,
            points: 1,
            explanation: "",
          },
        ],
      },
  );
  const original = useRef(JSON.stringify(quiz));
  const confirmDiscard = useUnsavedChanges(JSON.stringify(quiz) !== original.current);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [preview, setPreview] = useState(false);
  const [previewAnswer, setPreviewAnswer] = useState<number | null>(null);
  const currentIndex = Math.min(activeIndex, quiz.questions.length - 1);
  const ready = quizSchema.safeParse(quiz).success;
  function addQuestion() {
    if (quiz.questions.length >= 30) return;
    setQuiz({ ...quiz, questions: [...quiz.questions, {
      id: crypto.randomUUID(), text: "", options: ["", "", "", ""], correct: -1, points: 1, explanation: "",
    }] });
    setActiveIndex(quiz.questions.length);
    setPreview(false);
  }
  async function save(publish = quiz.published) {
    if (pending.current) return;
    pendingQuizId.current ??= crypto.randomUUID();
    const result = quizSchema.safeParse({
      ...quiz,
      id: initial ? quiz.id : pendingQuizId.current,
      published: publish,
      questions: quiz.questions.map(question => question.id === "pending-question" ? { ...question, id: crypto.randomUUID() } : question),
    });
    if (!result.success) {
      setError(
        "Test nomi, savollar va javoblarni to‘ldiring; har savol uchun to‘g‘ri javob va ballni belgilang.",
      );
      const questionIndex = result.error.issues.find(issue => issue.path[0] === "questions" && typeof issue.path[1] === "number")?.path[1];
      if (typeof questionIndex === "number") setActiveIndex(questionIndex);
      setPreview(false);
      return;
    }
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      const response = await saveWorkspace("quiz", result.data);
      if (saved(response)) {
        original.current = JSON.stringify(quiz);
        router.push("/admin/quizzes");
      } else if (!response.ok) setError(response.message);
    } catch {
      setError("Saqlash tasdiqlanmadi. Internetni tekshiring va qayta urinib ko‘ring.");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  return (
    <div className="gq-builder">
      <header className="gq-builder-heading"><Link className="back-link" href="/admin/quizzes" onClick={event => { if (pending.current || !confirmDiscard()) event.preventDefault(); }}><ArrowLeft size={18} />Testlarga qaytish</Link><div><h1>{initial ? initial.title : "Yangi test"}</h1><span className={`gq-status ${quiz.published ? "is-published" : "is-draft"}`}>{quiz.published ? "Nashr qilingan" : "Qoralama"}</span></div><p>Test savollarini tuzing, javoblarni belgilang va sozlamalarni moslang.</p></header>
      <form
        className="gq-builder-form"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <fieldset disabled={saving} className="contents" aria-busy={saving}>
        <section className="gq-builder-setup">
          <label className="form-field">
            Test nomi
            <Input
              value={quiz.title}
              required
              minLength={3}
              maxLength={120}
              onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
            />
          </label>
          <div className="course-form-grid">
            <Choice
              label="Kurs"
              disabled={saving}
              value={quiz.courseId}
              onChange={(v) => setQuiz({ ...quiz, courseId: v })}
              items={w.courses.map((c) => ({ value: c.id, label: c.title }))}
            />
          </div>
        </section>
        <div className="gq-builder-grid">
          <aside className="gq-question-list"><h2>Savollar ({quiz.questions.length})</h2><ol>{quiz.questions.map((question, index) => <li key={question.id}><button type="button" className={currentIndex === index ? "is-active" : ""} aria-current={currentIndex === index ? "step" : undefined} onClick={() => { setActiveIndex(index); setPreview(false); setPreviewAnswer(null); }}><span>{index + 1}</span>{question.text.trim() || `Yangi savol ${index + 1}`}</button></li>)}</ol><Button type="button" variant="outline" disabled={quiz.questions.length >= 30} onClick={addQuestion}><Plus size={16} />Savol qo‘shish</Button></aside>
        {quiz.questions.map((q, index) => index !== currentIndex ? null : (
          <section className="gq-question-panel" key={q.id}>
            <div className="panel-heading">
              <div><span className="gq-muted">Savol {index + 1} / {quiz.questions.length}</span><h2>{q.text.trim() || "Yangi savol"}</h2></div>
              <Button type="button" variant="outline" onClick={() => { setPreview(!preview); setPreviewAnswer(null); }}>{preview ? "Tahrirlash" : "Oldindan ko‘rish"}</Button>
            </div>
            {preview ? <div className="gq-preview"><p>{q.text || "Savol matnini kiriting."}</p>{q.options.map((option, oi) => <button type="button" key={oi} className={previewAnswer === oi ? "is-selected" : ""} onClick={() => setPreviewAnswer(oi)}><span>{String.fromCharCode(65 + oi)}</span>{option || `${oi + 1}-variant`}</button>)}{previewAnswer !== null && <p className="gq-preview-feedback">{previewAnswer === q.correct ? "To‘g‘ri javob" : "Noto‘g‘ri javob"}{q.explanation && ` · ${q.explanation}`}</p>}</div> : <>
            <div className="gq-question-tools">
              <Button type="button" variant="outline" disabled={index === 0} onClick={() => setActiveIndex(index - 1)}><ChevronLeft size={16} />Oldingi</Button>
              <Button type="button" variant="outline" disabled={index === quiz.questions.length - 1} onClick={() => setActiveIndex(index + 1)}>Keyingi<ChevronRight size={16} /></Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={quiz.questions.length === 1}
                aria-label={`${index + 1}-savolni olib tashlash`}
                onClick={() => {
                  setQuiz({
                    ...quiz,
                    questions: quiz.questions.filter(
                      (item) => item.id !== q.id,
                    ),
                  });
                  setActiveIndex(Math.max(0, index - 1));
                }}
              >
                <Trash2 />
              </Button>
            </div>
            <label className="form-field">
              Savol matni
              <Textarea
                value={q.text}
                required
                minLength={3}
                maxLength={1000}
                onChange={(e) =>
                  setQuiz({
                    ...quiz,
                    questions: quiz.questions.map((item) =>
                      item.id === q.id
                        ? { ...item, text: e.target.value }
                        : item,
                    ),
                  })
                }
              />
            </label>
            <RadioGroup
              disabled={saving}
              aria-label={`${index + 1}-savolning to‘g‘ri javobi`}
              value={q.correct < 0 ? "" : String(q.correct)}
              onValueChange={(v) =>
                setQuiz({
                  ...quiz,
                  questions: quiz.questions.map((item) =>
                    item.id === q.id ? { ...item, correct: Number(v) } : item,
                  ),
                })
              }
            >
              {q.options.map((option, oi) => (
                <div className="answer-editor" key={oi}>
                  <RadioGroupItem
                    id={`${q.id}-${oi}`}
                    value={String(oi)}
                    aria-label={`${oi + 1}-variantni to‘g‘ri javob qilish`}
                  />
                  <Input
                    aria-label={`${index + 1}-savol ${oi + 1}-variant`}
                    placeholder={`${oi + 1}-variant`}
                    required
                    maxLength={500}
                    value={option}
                    onChange={(e) =>
                      setQuiz({
                        ...quiz,
                        questions: quiz.questions.map((item) =>
                          item.id === q.id
                            ? {
                                ...item,
                                options: item.options.map((o, i) =>
                                  i === oi ? e.target.value : o,
                                ),
                              }
                            : item,
                        ),
                      })
                    }
                  />
                </div>
              ))}
            </RadioGroup>
            <Choice
              label="To‘g‘ri javob"
              disabled={saving}
              value={String(q.correct)}
              onChange={(value) => setQuiz({
                ...quiz,
                questions: quiz.questions.map(item => item.id === q.id ? { ...item, correct: Number(value) } : item),
              })}
              items={[{ value: "-1", label: "Javobni tanlang" }, ...q.options.map((option, oi) => ({ value: String(oi), label: `${String.fromCharCode(65 + oi)} · ${option || `${oi + 1}-variant`}` }))]}
            />
            <label className="form-field">
              Javob izohi
              <Textarea
                maxLength={2000}
                value={q.explanation}
                onChange={(e) =>
                  setQuiz({
                    ...quiz,
                    questions: quiz.questions.map((item) =>
                      item.id === q.id
                        ? { ...item, explanation: e.target.value }
                        : item,
                    ),
                  })
                }
              />
            </label>
            <label className="form-field gq-points-field">
              Savol bali
              <Input
                type="number"
                min={1}
                max={100}
                required
                value={q.points ?? 1}
                onChange={(event) => setQuiz({
                  ...quiz,
                  questions: quiz.questions.map(item => item.id === q.id ? { ...item, points: Number(event.target.value) } : item),
                })}
              />
            </label>
            </>}
          </section>
        ))}
        <aside className="gq-settings"><h2>Test sozlamalari</h2>
          <label className="form-field">O‘tish bali (%)<Input type="number" min={1} max={100} required value={quiz.passScore} onChange={event => setQuiz({ ...quiz, passScore: Number(event.target.value) })} /></label>
          <label className="form-field">Urinishlar<Input type="number" min={1} max={10} required value={quiz.maxAttempts ?? 3} onChange={event => setQuiz({ ...quiz, maxAttempts: Number(event.target.value) })} /></label>
          <label className="form-field">Savollar soni<Input type="number" value={quiz.questions.length} readOnly aria-label="Savollar soni" /></label>
          <div className="toggle-row"><label htmlFor="quiz-published">Nashr qilingan</label><Switch id="quiz-published" disabled={saving} checked={quiz.published} onCheckedChange={value => setQuiz({ ...quiz, published: value })} /></div>
          <h3>Tekshiruv ro‘yxati</h3><ul className="gq-checklist"><li data-ready={quiz.questions.length > 0}>Kamida bitta savol qo‘shilgan</li><li data-ready={quiz.questions.every(question => question.text.trim().length >= 3)}>Barcha savollar yozilgan</li><li data-ready={quiz.questions.every(question => question.options.every(option => !!option.trim()))}>Javob variantlari to‘ldirilgan</li><li data-ready={quiz.questions.every(question => question.correct >= 0 && question.correct <= 3)}>To‘g‘ri javoblar belgilangan</li><li data-ready={ready}>Testni nashr qilishga tayyor</li></ul>
          <p className="gq-settings-note">Testni nashr qilishdan oldin barcha savollar va javoblarni tekshiring.</p>
        </aside>
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="gq-builder-actions">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => { if (confirmDiscard()) router.push("/admin/quizzes"); }}
          >
            Bekor qilish
          </Button>
          <Button type="submit" variant="outline" disabled={saving}>{saving ? "Saqlanmoqda…" : "Testni saqlash"}</Button>
          {!quiz.published && <Button type="button" className="gq-primary" disabled={saving} onClick={() => save(true)}>Nashr qilish</Button>}
        </div>
        </fieldset>
      </form>
    </div>
  );
}
