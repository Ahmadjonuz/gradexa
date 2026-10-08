import Link from "next/link";
import { GradexaMark } from "./gradexa-mark";

export function GradexaLogo({ href = "/admin" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="Gradexa bosh sahifa">
      <GradexaMark decorative />
      <span>Gradexa</span>
    </Link>
  );
}
