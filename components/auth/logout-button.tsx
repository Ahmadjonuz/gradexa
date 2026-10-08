import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/login/actions";

export function LogoutButton({ className = "" }: { className?: string }) {
  return (
    <form action={logoutAction} className={className}>
      <button type="submit" className="text-link inline-flex items-center gap-2 text-sm">
        <LogOut size={16} />
        Chiqish
      </button>
    </form>
  );
}
