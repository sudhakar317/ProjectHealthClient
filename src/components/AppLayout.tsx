import { useState } from "react";
import { ClipboardList, Home, LogOut, Menu, ScrollText, Stethoscope, UserPlus, X } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";
import { cn } from "@/lib/utils";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="min-h-screen lg:flex">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-4 lg:hidden">
        <div className="flex items-center gap-2 font-semibold">
          <Stethoscope className="h-5 w-5 text-primary" />
          Clinic
        </div>
        <button
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg p-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {open && <div className="fixed inset-0 z-30 bg-foreground/40 lg:hidden" onClick={close} aria-hidden="true" />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card p-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-6 hidden items-center gap-2 px-3 text-lg font-semibold lg:flex">
          <Stethoscope className="h-6 w-6 text-primary" />
          Clinic
        </div>
        <nav className="mt-14 flex-1 space-y-1 lg:mt-0">
          <NavLink to="/" end className={linkClass} onClick={close}>
            <Home className="h-4 w-4" />
            Home
          </NavLink>
          {user?.role === "ADMIN" && (
            <>
              <NavLink to="/doctors" className={linkClass} onClick={close}>
                <UserPlus className="h-4 w-4" />
                Doctors
              </NavLink>
              <NavLink to="/specializations" className={linkClass} onClick={close}>
                <ClipboardList className="h-4 w-4" />
                Specializations
              </NavLink>
              <NavLink to="/audit-logs" className={linkClass} onClick={close}>
                <ScrollText className="h-4 w-4" />
                Audit logs
              </NavLink>
            </>
          )}
        </nav>
        <div className="border-t pt-4">
          <p className="truncate px-3 text-xs text-muted-foreground">{user?.email}</p>
          <button
            onClick={() => void logout()}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
