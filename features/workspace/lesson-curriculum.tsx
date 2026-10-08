"use client";
import Link from "next/link";
import { CheckCircle2, PlayCircle, LockKeyhole } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { lessonGroups, lessonUnlocked } from "./learning-model";
import type { Lesson } from "./model";
export function LessonCurriculum({ lessons, completed = [], enrolled = true, sequential = false, currentId, admin = false }: { lessons: Lesson[]; completed?: string[]; enrolled?: boolean; sequential?: boolean; currentId?: string; admin?: boolean }) {
  const groups = lessonGroups(lessons);
  const current = groups.find(g => g.lessons.some(l => l.id === currentId))?.name ?? groups[0]?.name;
  return <Accordion key={currentId ?? "course"} type="multiple" defaultValue={current ? [current] : []} className="gc-curriculum">{groups.map((group, index) => <AccordionItem value={group.name} key={group.name}><AccordionTrigger><span className="gc-module-title">{index + 1}. {group.name}<small>{group.lessons.length} dars · {group.lessons.reduce((sum, l) => sum + l.minutes, 0)} daqiqa</small></span></AccordionTrigger><AccordionContent>{group.lessons.map(lesson => {
    const done = completed.includes(lesson.id), unlocked = admin || (enrolled && lessonUnlocked(lesson.id, lessons, completed, sequential));
    const inner = <>{!unlocked ? <LockKeyhole size={17} /> : done ? <CheckCircle2 size={18} /> : <PlayCircle size={18} />}<span>{lesson.title}{admin && !lesson.published && <small> · Qoralama</small>}</span><small>{lesson.minutes} min</small></>;
    return unlocked ? <Link key={lesson.id} href={(admin ? "/admin/lessons/" : "/student/lessons/") + lesson.id} className={"gc-lesson-row" + (currentId === lesson.id ? " current" : "")} aria-current={currentId === lesson.id ? "page" : undefined}>{inner}</Link> : <div key={lesson.id} className="gc-lesson-row locked" title={enrolled ? "Avvalgi darslarni yakunlang" : "Avval kursga yoziling"}>{inner}</div>;
  })}</AccordionContent></AccordionItem>)}</Accordion>;
}
