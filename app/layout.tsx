import type { Metadata } from "next";
import "./globals.css";
import "./gradexa.css";
import "./courses.css";
import "./workspace.css";

export const metadata: Metadata = {
  title: "Gradexa — Learning, elevated",
  description: "Gradexa ta’lim platformasi. Administrator ish maydoni.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body className="antialiased">{children}</body>
    </html>
  );
}
