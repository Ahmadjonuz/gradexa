"use client";
import Link from "next/link";
import { MoreHorizontal, Pencil, BookOpen, Users, PlaySquare, ArrowUpRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { courseCover } from "./course-art";
import { StatusBadge } from "./course-shared";
import type { Course } from "./model";
import "./learning-pages.css";

export function CourseCard({ course, lessons, progress = course.progress, student = false, completed = 0 }: { course: Course; lessons: number; progress?: number; student?: boolean; completed?: number }) {
  const href = (student ? "/student/courses/" : "/admin/courses/") + course.id;
  return <article className="gc-card"><div className="gc-cover"><Link href={href} tabIndex={-1} aria-hidden="true"><img src={courseCover(course)} alt="" width="600" height="337" loading="lazy" /></Link><StatusBadge status={course.status} />{!student && <DropdownMenu><DropdownMenuTrigger className="gc-card-menu" aria-label={course.title + " amallari"}><MoreHorizontal size={19} /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link href={href}><BookOpen />Kursni ochish</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href={href + "?edit=1"}><Pencil />Tahrirlash</Link></DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</div><div className="gc-card-body"><h2><Link href={href}>{course.title}</Link></h2><p>{course.description}</p><div className="gc-card-meta"><span><PlaySquare size={16} />{student ? completed + "/" : ""}{lessons} dars</span>{!student && <span><Users size={16} />{course.students} talaba</span>}<strong>{progress}%</strong></div><Progress value={progress} aria-label={course.title + ": " + progress + "%"} className="h-1.5" /><Link className="gc-card-open" href={href}>{student ? "O‘rganishni davom ettirish" : "Kursni ochish"}<ArrowUpRight size={16} /></Link></div></article>;
}
