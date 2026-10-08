"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, ClipboardList, PlayCircle, Search, Users, Zap } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkspace } from "@/features/workspace/store";
import { adminActions } from "@/features/workspace/admin-tools";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};
export function CommandPalette({ open, onOpenChange }: Props) {
  const { courses, error, data } = useWorkspace();
  const students = data.students;
  const router = useRouter();
  const pathname = usePathname();
  const focusDestination = useRef<string | null>(null);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k" &&
        !event.isComposing
      ) {
        event.preventDefault();
        if (!event.repeat) onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);
  function jump(id: string) {
    if (pathname !== "/admin") {
      navigate(`/admin#${id}`);
      return;
    }
    focusDestination.current = id;
    onOpenChange(false);
  }
  function navigate(href: string) {
    onOpenChange(false);
    router.push(href);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          if (focusDestination.current) {
            event.preventDefault();
            document.getElementById(focusDestination.current)?.focus();
            focusDestination.current = null;
          }
        }}
        className="top-[12%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Gradexa qidiruvi</DialogTitle>
          <DialogDescription>
            Kurslar, darslar, testlar, talabalar va amallarni qidiring.
          </DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Kurs, dars, test yoki talaba…" />
          <CommandList>
            <CommandEmpty>
              Natija topilmadi. Boshqa so‘z bilan qidiring.
            </CommandEmpty>
            <CommandGroup heading="Kurslar">
              {courses.map((course) => (
                <CommandItem
                  key={course.id}
                  value={`kurs course ${course.title} ${course.id}`}
                  onSelect={() => navigate(`/admin/courses/${course.id}`)}
                >
                  <BookOpen />
                  {course.title}
                </CommandItem>
              ))}
            </CommandGroup>
            {error && (
              <p className="px-4 py-2 text-sm text-muted-foreground">
                Ma’lumotlar to‘liq yuklanmadi. Tegishli bo‘limda qayta urinib ko‘ring.
              </p>
            )}
            <CommandGroup heading="Darslar">
              {data.lessons.map(lesson => (
                <CommandItem key={lesson.id} value={`dars ${lesson.title} ${lesson.module} ${courses.find(c => c.id === lesson.courseId)?.title ?? ""} ${lesson.id}`} onSelect={() => navigate(`/admin/lessons/${lesson.id}`)}>
                  <PlayCircle />{lesson.title}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Testlar">
              {data.quizzes.map(quiz => (
                <CommandItem key={quiz.id} value={`test quiz ${quiz.title} ${courses.find(c => c.id === quiz.courseId)?.title ?? ""} ${quiz.id}`} onSelect={() => navigate(`/admin/quizzes/${quiz.id}`)}>
                  <ClipboardList />{quiz.title}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Talabalar">
              {students.map((student) => (
                <CommandItem
                  key={student.id}
                  value={`talaba student ${student.name} ${student.email}`}
                  onSelect={() => navigate(`/admin/students/${student.id}`)}
                >
                  <Users />
                  {student.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Amallar">
              {adminActions.map((item) => (
                <CommandItem
                  key={item.href}
                  value={item.name}
                  onSelect={() => navigate(item.href)}
                >
                  <Zap />
                  {item.name}
                </CommandItem>
              ))}
              <CommandItem
                value="tasks vazifalar quick tasks"
                onSelect={() => jump("quick-tasks")}
              >
                <Zap />
                Vazifalarga o‘tish
              </CommandItem>
              <CommandItem
                value="courses kurslar ro‘yxati"
                onSelect={() => navigate("/admin/courses")}
              >
                <Search />
                Kurslar ro‘yxatiga o‘tish
              </CommandItem>
              <CommandItem
                value="create new course yangi kurs yaratish"
                onSelect={() => navigate("/admin/courses/new")}
              >
                <BookOpen />
                Yangi kurs yaratish
              </CommandItem>
            </CommandGroup>
          </CommandList>
          <div className="palette-footer">
            ↑ ↓ tanlash <span>Enter ochish · Esc yopish</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
