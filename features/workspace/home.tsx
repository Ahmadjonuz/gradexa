"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChartNoAxesCombined, ClipboardList, Play, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Course } from "@/features/courses/model";
import { courseCover } from "@/features/courses/course-art";
type CatalogProps = { courses: Course[]; unavailable?: boolean };
import type { PublicLanguage } from "@/lib/public-language";
import { LanguageControl, PublicBrand, PublicFooter, PublicSurface, usePublicCopy } from "./public-ui";

function HomeContent({ courses, unavailable }: CatalogProps) {
  const { t, href, language } = usePublicCopy();
  const features = [{ icon: Play, title: t.video, description: t.videoDescription }, { icon: ClipboardList, title: t.tests, description: t.testsDescription }, { icon: ChartNoAxesCombined, title: t.results, description: t.resultsDescription }];
  const steps = [{ icon: BookOpen, title: t.step1, text: t.step1Description }, { icon: Play, title: t.step2, text: t.step2Description }, { icon: ClipboardList, title: t.step3, text: t.step3Description }, { icon: ChartNoAxesCombined, title: t.step4, text: t.step4Description }];
  const empty = { uz: "Hozircha nashr qilingan kurs yo‘q.", en: "No published courses yet.", ru: "Опубликованных курсов пока нет." };
  const failed = { uz: "Kurslarni yuklab bo‘lmadi. Sahifani qayta yuklang.", en: "Could not load courses. Reload this page.", ru: "Не удалось загрузить курсы. Обновите страницу." };
  return <div className="gx-shell gx-home-shell">
    <header className="gx-home-header"><PublicBrand /><nav aria-label={t.home}><a href="#courses">{t.courses}</a><a href="#how-it-works">{t.how}</a></nav><div className="gx-header-actions"><LanguageControl /><Button asChild className="gx-button gx-button-primary"><Link href={href("/login")}>{t.login}</Link></Button></div></header>
    <section className="gx-home-hero" aria-labelledby="home-title">
      <div className="gx-home-art" aria-hidden="true"><img src="/images/gradexa/learning-hero.png" width="1536" height="1024" alt="" fetchPriority="high" /><div className="gx-art-shade" /></div>
      <div className="gx-home-intro"><p className="gx-eyebrow">{t.eyebrow}</p><h1 id="home-title">{t.heroStart} <span>{t.heroGold}</span>{t.heroEnd === "." ? "." : " " + t.heroEnd}</h1><p className="gx-hero-description">{t.heroDescription}</p>
        <div className="gx-home-buttons"><Button asChild className="gx-button gx-button-primary"><Link href={href("/login")}>{t.start}<ArrowRight aria-hidden="true" /></Link></Button><Button asChild variant="outline" className="gx-button gx-button-outline"><a href="#courses">{t.viewCourses}</a></Button></div>
        <div className="gx-benefits">{features.map(item => <div key={item.title}><span className="gx-feature-icon"><item.icon aria-hidden="true" /></span><p><strong>{item.title}</strong><small>{item.description}</small></p></div>)}</div>
      </div>
      <aside className="gx-hero-details" aria-hidden="true"><p className="gx-art-quote">{t.quote}</p><div className="gx-goal-badge"><span><Check /></span><p><strong>{t.goal}</strong><small>{t.goalDescription}</small></p></div></aside>
    </section>
    <section className="gx-home-section" id="courses" aria-labelledby="courses-title"><div className="gx-section-heading"><h2 id="courses-title">{t.popular}</h2><Link href={href("/login")}>{t.allCourses}<ArrowRight aria-hidden="true" /></Link></div>
      <div className="gx-course-grid">{courses.map((course) => <article className="gx-course-card" key={course.id}><Link className="gx-course-link" href={href("/login")} aria-label={course.title + " — " + t.openCourse}>
        <div className="gx-course-image"><img src={courseCover(course)} alt="" width="1536" height="1024" loading="lazy" /></div><div className="gx-course-copy"><span className="gx-course-tag">{course.category}</span><h3>{course.title}</h3><p>{course.description}</p><div className="gx-course-meta"><span><BookOpen aria-hidden="true" />{course.language?.toUpperCase()}</span><span><ChartNoAxesCombined aria-hidden="true" />{course.level === "beginner" ? t.beginner : course.level === "intermediate" ? t.intermediate : { uz: "Yuqori", en: "Advanced", ru: "Продвинутый" }[language]}</span><i className="gx-round-arrow"><ArrowRight aria-hidden="true" /></i></div></div>
      </Link></article>)}</div>{!courses.length && <p role={unavailable ? "alert" : "status"} className="mt-5">{unavailable ? failed[language] : empty[language]}</p>}
    </section>
    <section className="gx-home-section gx-how" id="how-it-works" aria-labelledby="how-title"><div className="gx-section-heading"><h2 id="how-title">{t.how}?</h2><p>{t.fourSteps}</p></div><ol className="gx-steps">{steps.map((step, index) => <li key={step.title}><span className="gx-feature-icon"><step.icon aria-hidden="true" /></span><div><h3>{index + 1}. {step.title}</h3><p>{step.text}</p></div>{index < 3 && <ArrowRight className="gx-step-arrow" aria-hidden="true" />}</li>)}</ol></section>
    <PublicFooter />
  </div>;
}

export function PublicHome({ initialLanguage, courses, unavailable }: { initialLanguage?: PublicLanguage } & CatalogProps) {
  return <PublicSurface initialLanguage={initialLanguage} className="gx-home"><HomeContent courses={courses} unavailable={unavailable} /></PublicSurface>;
}
