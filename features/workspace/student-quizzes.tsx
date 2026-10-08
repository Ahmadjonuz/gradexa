"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useWorkspace, submitAttempt } from "./store";
import { StudentAccess } from "./student-pages";
import { PageHeading, CourseEmpty } from "./ui";
import type { QuizView } from "./model";
import { quizAvailability } from "./study-flow";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
export function StudentQuizzes() {
  const w = useWorkspace();
  const list = w.data.quizzes.filter(
    (q) =>
      q.published &&
      w.student?.courseIds.includes(q.courseId) &&
      w.courses.some((c) => c.id === q.courseId && c.status === "published"),
  );
  return (
    <StudentAccess w={w}>
      <PageHeading
        title="Testlar"
        subtitle="O‘rgangan bilimlaringizni tekshiring."
      />
      {list.length ? (
        <div className="course-catalog-grid">
          {list.map((q) => {
            const { attempts, remaining, canStart, latest } = quizAvailability(q, w.courses, w.student, w.data.attempts);
            return (
              <article className="panel quiz-card" key={q.id}>
                <span className="course-level">
                  {w.courses.find((c) => c.id === q.courseId)?.title}
                </span>
                <h2>{q.title}</h2>
                <p>
                  {q.questions.length} savol · o‘tish {q.passScore}%
                </p>
                <p>
                  Eng yaxshi natija:{" "}
                  {attempts.length
                    ? Math.max(...attempts.map((a) => a.score)) + "%"
                    : "hali yo‘q"}
                </p>
                <p>Qolgan urinishlar: {remaining} / {q.maxAttempts ?? 3}</p>
                {canStart ? <Button asChild>
                  <Link href={`/student/quizzes/${q.id}`}>
                    {attempts.length ? "Qayta topshirish" : "Boshlash"}
                  </Link>
                </Button> : <Button disabled>{remaining ? "Test tayyor emas" : "Urinishlar tugagan"}</Button>}
                {latest && <Button asChild variant="outline" className="mt-3"><Link href={`/student/results/${latest.id}`}>So‘nggi natija</Link></Button>}
              </article>
            );
          })}
        </div>
      ) : (
        <CourseEmpty
          title="Testlar hali yo‘q"
          description="Kursga yozilgach uning nashr qilingan testlari shu yerda chiqadi."
        />
      )}
    </StudentAccess>
  );
}
export function QuizRunner({ quizId }: { quizId: string }) {
  const w = useWorkspace();
  const quiz = w.data.quizzes.find(
    (q) =>
      q.id === quizId &&
      q.published &&
      w.student?.courseIds.includes(q.courseId) &&
      w.courses.some((c) => c.id === q.courseId && c.status === "published"),
  );
  const availability = quizAvailability(quiz, w.courses, w.student, w.data.attempts);
  return (
    <StudentAccess w={w}>
      {quiz && w.student && availability.canStart ? (
        <QuizSession
          key={`${quizId}-${w.student.id}`}
          quiz={quiz}
        />
      ) : (
        <CourseEmpty
          title={availability.accessible ? "Urinishlar tugagan" : "Test mavjud emas"}
          description={availability.accessible ? "Oldingi urinishlaringiz va javoblar tahlili saqlangan." : "Kursga yozilish va test holatini tekshiring."}
        >
          <Button asChild>
            <Link href="/student/quizzes">Testlarga qaytish</Link>
          </Button>
          {availability.latest && <Button variant="outline" asChild><Link href={`/student/results/${availability.latest.id}`}>So‘nggi natijani ko‘rish</Link></Button>}
        </CourseEmpty>
      )}
    </StudentAccess>
  );
}
function QuizSession({ quiz }: { quiz: QuizView }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(() => structuredClone(quiz));
  const [answers, setAnswers] = useState<number[]>(() =>
    snapshot.questions.map(() => -1),
  );
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const requestId = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const changed = snapshot.revision !== quiz.revision;
  const answersLocked = pending || requestId.current !== null || changed;
  const q = snapshot.questions[index];
  const count = answers.filter((a) => a >= 0).length;
  useEffect(() => {
    if (!count) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [count]);
  function review() {
    if (pending || changed) return;
    if (count !== answers.length) {
      setError("Barcha savollarga javob bering.");
      setIndex(answers.indexOf(-1));
      return;
    }
    setConfirming(true);
  }
  async function finish() {
    if (submitting.current || changed) return;
    if (count !== answers.length) {
      setError("Barcha savollarga javob bering.");
      setIndex(answers.indexOf(-1));
      return;
    }
    submitting.current = true;
    setPending(true);
    requestId.current ??= crypto.randomUUID();
    const result = await submitAttempt(snapshot.id, answers, snapshot.revision ?? "", requestId.current);
    if (result.ok && result.id) router.push(`/student/results/${result.id}`);
    else {
      setError(result.ok ? "Natija topilmadi." : result.message);
      submitting.current = false;
      setPending(false);
    }
  }
  return (
    <>
      <Link href="/student/quizzes" className="back-link" onClick={event => {
        if (pending || (count > 0 && !window.confirm("Testdan chiqasizmi? Yuborilmagan javoblar yo‘qoladi."))) event.preventDefault();
      }}>
        ← Testlar ro‘yxati
      </Link>
      <PageHeading
        title={snapshot.title}
        subtitle={`${snapshot.questions.length} savol · o‘tish ${snapshot.passScore}%`}
      />
      <section className="panel quiz-runner">
        {changed && <div className="storage-error" role="alert"><p>Administrator testni yangilagan. Eski savollar bilan yuborib bo‘lmaydi. Yangilangan testni ochish javoblarni tozalaydi.</p><Button variant="outline" disabled={pending} onClick={() => { setSnapshot(structuredClone(quiz)); setAnswers(quiz.questions.map(() => -1)); setIndex(0); setError(""); setConfirming(false); requestId.current = null; }}>Yangilangan testni ochish</Button></div>}
        <div className="panel-heading">
          <span>
            {index + 1} / {snapshot.questions.length}-savol
          </span>
          <span>{count} ta javob belgilandi</span>
        </div>
        <Progress
          value={(count / snapshot.questions.length) * 100}
          aria-label="Javob berilgan savollar"
        />
        <h2>{q.text}</h2>
        <RadioGroup
          disabled={answersLocked}
          value={answers[index] < 0 ? "" : String(answers[index])}
          onValueChange={(value) => {
            setAnswers((previous) =>
              previous.map((a, i) => (i === index ? Number(value) : a)),
            );
            setError("");
          }}
          aria-label={q.text}
        >
          {q.options.map((option, oi) => (
            <label
              className={`quiz-option ${answers[index] === oi ? "chosen" : ""}`}
              key={`${q.id}-${oi}`}
            >
              <RadioGroupItem value={String(oi)} />
              <span>{String.fromCharCode(65 + oi)}.</span>
              <strong>{option}</strong>
            </label>
          ))}
        </RadioGroup>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="question-dots" aria-label="Savolga o‘tish">
          {snapshot.questions.map((question, i) => (
            <Button
              key={question.id}
              disabled={pending}
              size="icon"
              variant={i === index ? "default" : answers[i] >= 0 ? "secondary" : "outline"}
              aria-current={i === index ? "step" : undefined}
              aria-label={`${i + 1}-savol${answers[i] >= 0 ? ", javob belgilangan" : ""}`}
              onClick={() => setIndex(i)}
            >
              {i + 1}
            </Button>
          ))}
        </div>
        <div className="form-actions">
          <Button
            variant="outline"
            disabled={pending || index === 0}
            onClick={() => setIndex(index - 1)}
          >
            Oldingi
          </Button>
          {index < snapshot.questions.length - 1 ? (
            <Button disabled={pending} onClick={() => setIndex(index + 1)}>Keyingi</Button>
          ) : (
            <Button disabled={pending || changed} onClick={review}>{pending ? "Tekshirilmoqda…" : requestId.current ? "Yuborishni qayta tekshirish" : "Testni yakunlash"}</Button>
          )}
        </div>
      </section>
      {requestId.current && !pending && error && <p className="form-hint mt-4">Javoblar shu oynada saqlanib turibdi, ularni hozir o‘zgartirib bo‘lmaydi. Qayta tekshirish aynan shu so‘rovni takrorlaydi, yangi urinish yaratmaydi. <Link className="text-link" href="/student/results">Natijalarni tekshirish</Link></p>}
      <AlertDialog open={confirming && !changed} onOpenChange={setConfirming}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Testni yakunlaysizmi?</AlertDialogTitle><AlertDialogDescription>{count} / {snapshot.questions.length} ta savolga javob berildi. Yuborilgandan keyin javoblarni o‘zgartirib bo‘lmaydi. Natija serverda hisoblanadi.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Javoblarni tekshirish</AlertDialogCancel><AlertDialogAction disabled={pending} onClick={() => void finish()}>Tasdiqlash va yuborish</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <p className="form-hint mt-4">
        Javoblar yakunlashdan keyin saqlanadi. Sahifani yangilash tugallanmagan
        javoblarni tozalaydi. Ball serverda hisoblanadi va natija akkauntingizda saqlanadi.
      </p>
    </>
  );
}
