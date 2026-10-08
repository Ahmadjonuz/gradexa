"use client";
import Link from "next/link";
import { ArrowLeft, House } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageControl, PublicBrand, PublicFooter, PublicSurface, usePublicCopy } from "./public-ui";
import "./invitation-pages.css";

const copy = {
  uz: { title: "Sahifa topilmadi", description: "Qidirayotgan sahifangiz ko‘chirilgan yoki mavjud emas. Bilim sari yo‘l esa davom etadi.", home: "Bosh sahifaga qaytish", back: "Orqaga qaytish" },
  en: { title: "Page not found", description: "The page you’re looking for has moved or doesn’t exist. Your learning journey continues.", home: "Back to home", back: "Go back" },
  ru: { title: "Страница не найдена", description: "Эта страница перемещена или не существует. Но путь к знаниям продолжается.", home: "На главную", back: "Назад" },
};
function Content() {
  const { language, href } = usePublicCopy(), t = copy[language];
  function back() { if (window.history.length > 1) window.history.back(); else window.location.assign(href("/")); }
  return <div className="gx-shell gi-shell gn-shell"><header className="gi-header"><PublicBrand /><LanguageControl /></header><section className="gn-content"><img src="/images/gradexa/not-found.png" alt="404" width="1536" height="1024" fetchPriority="high" /><h1>{t.title}</h1><p>{t.description}</p><div className="gn-actions"><Button className="gx-button gx-button-primary" asChild><Link href={href("/")}><House />{t.home}</Link></Button><Button type="button" className="gx-button gx-button-outline" onClick={back}><ArrowLeft />{t.back}</Button></div></section><PublicFooter /></div>;
}
export function NotFoundView() { return <PublicSurface className="gn-public"><Content /></PublicSurface>; }
