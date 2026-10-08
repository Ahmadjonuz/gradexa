"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Users, BookOpen, PlayCircle, ChartNoAxesColumnIncreasing, CalendarDays, ArrowUpRight, CheckCheck, Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useWorkspace, saveWorkspace } from "@/features/workspace/store";
import { studentProgress, taskSchema } from "@/features/workspace/model";
import { WorkspaceGate, saved } from "@/features/workspace/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CompletionDonut, CourseTable, Metrics, Panel, ReportSelect, WeeklyChart } from "./report-ui";
import { localReport, weekdays } from "./report-model";
import { reportDate } from "@/lib/report-time";
import { DeleteRecordButton } from "@/features/deletions/delete-record-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

const weeks = { current: { label: "Oxirgi 7 kun" }, previous: { label: "Oldingi 7 kun" } };
export function DashboardView() {
  const w = useWorkspace();
  const records = w.courses, error = w.error, tasks = w.data.tasks;
  const [taskTitle, setTaskTitle] = useState(""), [saving, setSaving] = useState(false);
  const [editingTask, setEditingTask] = useState<(typeof tasks)[number] | null>(null);
  const [taskError, setTaskError] = useState("");
  const pending = useRef(false);
  const taskOriginal = useRef("");
  const confirmTaskDiscard = useUnsavedChanges(!!editingTask && editingTask.title !== taskOriginal.current);
  function closeTaskEditor() { if (!pending.current && confirmTaskDiscard()) setEditingTask(null); }
  const [today] = useState(() => reportDate());
  const [week, setWeek] = useState<keyof typeof weeks>("current");
  const completed = tasks.filter(t => t.completed).map(t => t.id);
  const [taskFilter, setTaskFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const courses = records.filter(c => c.status === "published").map(c => ({ id: c.id, name: c.title, students: c.students, progress: c.progress }));
  const selectedCourse = courses.find(c => c.id === courseFilter);
  const students = w.data.students.filter(s => !s.invitation && s.status === "active");
  const progress = students.flatMap(s => records.filter(c => c.status === "published" && s.courseIds.includes(c.id) && (!selectedCourse || c.id === selectedCourse.id)).map(c => studentProgress(w.data, s.id, c.id))).filter(p => p.total > 0);
  const completion = progress.length ? Math.round(progress.filter(p => p.percent === 100).length / progress.length * 100) : 0;
  const inProgress = progress.length ? Math.round(progress.filter(p => p.percent > 0 && p.percent < 100).length / progress.length * 100) : 0;
  const end = new Date(Date.parse(today+"T00:00:00Z") - (week === "previous" ? 7 : 0)*86400000).toISOString().slice(0,10);
  const report = localReport(w.data, records, end, 7);
  async function addTask() {
    if (pending.current) return;
    const parsed = taskSchema.safeParse({ id: crypto.randomUUID(), title: taskTitle, completed: false });
    if (!parsed.success) { setTaskError("Vazifa nomi 3–160 ta belgi bo‘lsin."); return; }
    pending.current = true; setTaskError("");
    setSaving(true);
    try { if (saved(await saveWorkspace("task", parsed.data))) setTaskTitle(""); }
    finally { pending.current = false; setSaving(false); }
  }
  async function saveTaskEdit() {
    if (pending.current) return;
    const parsed = taskSchema.safeParse(editingTask);
    if (!parsed.success) { setTaskError("Vazifa nomi 3–160 ta belgi bo‘lsin."); return; }
    pending.current = true; setSaving(true); setTaskError("");
    try {
      const result = await saveWorkspace("task", parsed.data);
      if (saved(result)) setEditingTask(null); else if (!result.ok) setTaskError(result.message);
    } finally { pending.current = false; setSaving(false); }
  }
  const visibleTasks = tasks.filter(task => taskFilter === "all" || (taskFilter === "done" ? completed.includes(task.id) : !completed.includes(task.id)));
  return <WorkspaceGate workspace={w}><div className="gx-report gx-dashboard">
    <section className="gx-welcome">
      <div><h1>Xush kelibsiz</h1><p>O‘quv jarayoni nazorat ostida</p></div>
      <div className="gx-welcome-art" aria-hidden="true"><img src="/images/gradexa/learning-hero.png" width={270} height={130} alt="" /><span>Bilim<br />katta imkoniyatlar<br />yaratadi<i /></span></div>
    </section>
    <Metrics items={[
      { label: "Faol talabalar", value: String(students.length), icon: Users },
      { label: "Faol kurslar", value: String(records.filter(c => c.status === "published").length), icon: BookOpen },
      { label: "Tugallangan darslar", value: String(report.completions), icon: PlayCircle, note: "Barcha vaqt" },
      { label: "Test urinishlari", value: String(report.attempts), icon: ChartNoAxesColumnIncreasing, note: weeks[week].label },
    ]} />
    <div className="gx-grid gx-dashboard-charts">
      <Panel title="Test topshirgan talabalar (Toshkent)" controls={<><CalendarDays size={15} aria-hidden="true" /><ReportSelect label="O‘quv faolligi haftasi" value={week} onChange={value => setWeek(value as keyof typeof weeks)} items={Object.entries(weeks).map(([value, data]) => ({ value, label: data.label }))} /></>}>
        <WeeklyChart data={report.trend.map(point => ({ day: weekdays[(new Date(point.date+"T00:00:00Z").getUTCDay()+6)%7], active: point.active }))} />
      </Panel>
      <Panel title="Kurslar bo‘yicha yakunlash" controls={<ReportSelect label="Yakunlash ko‘rsatkichidagi kurs" value={selectedCourse?.id ?? "all"} onChange={setCourseFilter} items={[{ value: "all", label: "Barchasi" }, ...courses.map(c => ({ value: c.id, label: c.name }))]} />}>
        <CompletionDonut complete={completion} progress={inProgress} />
        <p className="gx-hint gx-completion-note">{selectedCourse ? selectedCourse.name : "Barcha nashr qilingan kurslar"} · {progress.length} ta faol talaba–kurs juftligi</p>
      </Panel>
    </div>
    <div className="gx-grid gx-dashboard-lower">
      <Panel title="Joriy kurslar" controls={<Link className="gx-text-link" href="/admin/courses">Barchasi <ArrowUpRight size={14} /></Link>}>
        {error ? <p role="alert" className="gx-error">{error}</p> : <CourseTable courses={courses.slice(0, 3)} />}
      </Panel>
      <Panel id="quick-tasks" title="Bajarilishi kerak bo‘lgan vazifalar" className="gx-tasks-panel" controls={<ReportSelect label="Vazifalarni filtrlash" value={taskFilter} onChange={setTaskFilter} items={[{ value: "all", label: "Barchasi" }, { value: "pending", label: "Kutilmoqda" }, { value: "done", label: "Bajarilgan" }]} />}>
        <ul className="gx-tasks">{visibleTasks.map(task => <li key={task.id} data-done={completed.includes(task.id)}>
          <Checkbox id={`task-${task.id}`} checked={completed.includes(task.id)} disabled={saving} onCheckedChange={async checked => { if (pending.current) return; pending.current = true; setSaving(true); try { saved(await saveWorkspace("task", { ...task, completed: checked === true })); } finally { pending.current = false; setSaving(false); } }} />
          <label htmlFor={`task-${task.id}`}>{task.title}</label>
          <div className="ml-auto flex shrink-0"><Button type="button" variant="ghost" size="icon" disabled={saving} aria-label={`${task.title} — tahrirlash`} onClick={() => { setTaskError(""); taskOriginal.current = task.title; setEditingTask({ ...task }); }}><Pencil size={16} /></Button><DeleteRecordButton kind="task" id={task.id} name={task.title} compact disabled={saving} /></div>
        </li>)}</ul>
        {!visibleTasks.length && <p className="gx-empty"><CheckCheck size={20} />Bu ro‘yxatda vazifa yo‘q.</p>}
        <form className="flex gap-2 mt-4" onSubmit={e => { e.preventDefault(); void addTask(); }}><Input aria-label="Yangi vazifa" placeholder="Yangi vazifa…" minLength={3} maxLength={160} required disabled={saving} value={taskTitle} onChange={e => { setTaskTitle(e.target.value); setTaskError(""); }} /><Button disabled={saving} type="submit">{saving ? "Kutilmoqda…" : "Qo‘shish"}</Button></form>
        {taskError && !editingTask && <p role="alert" className="field-error mt-2">{taskError}</p>}
        <div className="gx-task-footer"><span>{completed.length} / {tasks.length} bajarildi</span><span>Supabase</span></div>
      </Panel>
    </div>
    <Dialog open={!!editingTask} onOpenChange={open => { if (!open) closeTaskEditor(); }}><DialogContent><DialogHeader><DialogTitle>Vazifani tahrirlash</DialogTitle><DialogDescription>Yangi nom Supabase’da saqlanadi.</DialogDescription></DialogHeader>{editingTask && <form className="space-y-4" onSubmit={event => { event.preventDefault(); void saveTaskEdit(); }}><label className="form-field">Vazifa nomi<Input autoFocus required minLength={3} maxLength={160} value={editingTask.title} disabled={saving} onChange={event => setEditingTask({ ...editingTask, title: event.target.value })} /></label>{taskError && <p role="alert" className="field-error">{taskError}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="outline" disabled={saving} onClick={closeTaskEditor}>Bekor qilish</Button><Button type="submit" disabled={saving}>{saving ? "Saqlanmoqda…" : "Saqlash"}</Button></div></form>}</DialogContent></Dialog>
    <p className="gx-report-source"><span />Supabase ma’lumotlari · faollik test urinishlari asosida, qolgan ko‘rsatkichlar barcha vaqt bo‘yicha.</p>
  </div></WorkspaceGate>;
}
