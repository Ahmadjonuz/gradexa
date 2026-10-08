"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, type CSSProperties } from "react";
import {
  BookOpen,
  LayoutDashboard,
  ClipboardList,
  Award,
  User,
  Search,
  LockKeyhole,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { Toaster } from "@/components/ui/sonner";
import { GradexaLogo } from "@/components/brand/gradexa-logo";
import { LogoutButton } from "@/components/auth/logout-button";
import { useWorkspace } from "@/features/workspace/store";
import { studentSearchLessons } from "@/features/workspace/admin-tools";
import { initials } from "@/features/workspace/account-utils";
import type { GradexaProfile } from "@/lib/auth";
import "@/features/dashboard/admin-pages.css";
const nav = [
  { label: "Bosh sahifa", href: "/student", icon: LayoutDashboard },
  { label: "Kurslarim", href: "/student/courses", icon: BookOpen },
  { label: "Testlar", href: "/student/quizzes", icon: ClipboardList },
  { label: "Natijalar", href: "/student/results", icon: Award },
  { label: "Profil", href: "/student/profile", icon: User },
];
function StudentNav() {
  const path = usePathname();
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenu>
      {nav.map((n) => (
        <SidebarMenuItem key={n.href}>
          <SidebarMenuButton
            asChild
            className="h-11 px-3 text-sm"
            isActive={
              n.href === "/student" ? path === n.href : path.startsWith(n.href) || (n.href === "/student/courses" && path.startsWith("/student/lessons/"))
            }
          >
            <Link href={n.href} onClick={() => setOpenMobile(false)}>
              <n.icon />
              <span>{n.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
export function StudentShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: GradexaProfile;
}) {
  const w = useWorkspace();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const displayName = w.student?.name ?? profile.full_name;
  const displayInitials = w.student ? initials(w.student.name) : profile.initials;
  const avatar = w.student?.avatar;
  const searchLessons = studentSearchLessons(w.courses, w.data, w.student);
  const courses = w.courses.filter(
    (c) => c.status === "published" && w.student?.courseIds.includes(c.id),
  );
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k" &&
        !event.isComposing &&
        !event.repeat
      ) {
        event.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  function go(href: string) {
    setOpen(false);
    router.push(href);
  }
  return (
    <SidebarProvider className={path.startsWith("/student/results") || path === "/student/profile" || path.startsWith("/student/courses") || path.startsWith("/student/lessons") ? "gx-admin" : ""} style={{ "--sidebar-width": "230px" } as CSSProperties}>
      <a href="#student-main" className="skip-link">
        Kontentga o‘tish
      </a>
      <Sidebar>
        <SidebarHeader className="px-6 py-7">
          <GradexaLogo href="/student" />
          <span className="workspace-label">STUDENT WORKSPACE</span>
        </SidebarHeader>
        <SidebarContent className="px-3 pt-4">
          <StudentNav />
          <div className="workspace-note">
            <strong>Bilimga vaqt ajrating.</strong>
            <p>
              O‘quv maqsadingiz: haftasiga {w.data.preferences.weeklyGoal} dars.
            </p>
            <Link className="text-link" href="/student/courses">
              O‘rganishni davom ettirish →
            </Link>
          </div>
        </SidebarContent>
        <SidebarFooter className="border-t border-border p-4">
          <Link href="/student/profile" className="profile-button">
            <span className="avatar">
              {avatar ? <img src={avatar} alt="" className="h-full w-full rounded-full object-cover" /> : displayInitials}
            </span>
            <span>
              <strong>{displayName}</strong>
              <small>Student</small>
            </span>
          </Link>
          <LogoutButton className="mt-4" />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-background min-w-0">
        <header className="topbar">
          <div className="topbar-path">
            <SidebarTrigger aria-label="Menyu" />
            <strong>
              {path.startsWith("/student/lessons/") ? "Darslar" : nav.find((n) => n.href !== "/student" && path.startsWith(n.href))
                ?.label ?? "Student kabineti"}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="demo-badge">Himoyalangan kirish</span>
            <button
              className="icon-button"
              aria-label="Qidirish Ctrl yoki Cmd K"
              onClick={() => setOpen(true)}
            >
              <Search size={19} />
            </button>
            <span className="topbar-language" aria-label="Til: O‘zbekcha">UZ</span>
            <Link href="/student/profile" className="avatar" aria-label="Profilni ochish">{avatar ? <img src={avatar} alt="" className="h-full w-full rounded-full object-cover" /> : displayInitials}</Link>
          </div>
        </header>
        <main id="student-main" tabIndex={-1} className="dashboard-main">
          {children}
        </main>
        <footer className="app-footer">
          <span>Gradexa © 2026</span>
          <span>Learning, elevated.</span>
        </footer>
      </SidebarInset>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="top-[12%] translate-y-0 overflow-hidden p-0"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Kurs va dars qidirish</DialogTitle>
            <DialogDescription>
              Yozilgan kurslaringiz ichidan qidiring.
            </DialogDescription>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Kurs yoki dars…" />
            <CommandList>
              <CommandEmpty>Natija topilmadi.</CommandEmpty>
              <CommandGroup heading="Kurslar">
                {courses.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`${c.title} ${c.id}`}
                    onSelect={() => go(`/student/courses/${c.id}`)}
                  >
                    <BookOpen />
                    {c.title}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Darslar">
                {searchLessons.map((l) => (
                    <CommandItem
                      key={l.id}
                      value={`${l.title} ${l.module} ${l.courseTitle} ${l.id}`}
                      onSelect={() => go(l.locked ? `/student/courses/${l.courseId}` : `/student/lessons/${l.id}`)}
                    >
                      {l.locked && <LockKeyhole size={16} />}<span>{l.title}{l.locked && <small className="block text-muted-foreground">Avvalgi darslarni yakunlang · kursni ochish</small>}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
      <Toaster theme="dark" richColors />
    </SidebarProvider>
  );
}
