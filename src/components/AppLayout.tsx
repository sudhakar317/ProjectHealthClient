import { Suspense, useEffect, useState } from "react";
import {
  ChevronsUpDown,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Stethoscope,
  Tags,
  Users,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import ThemeToggle from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, DrawerContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/auth/AuthContext";
import { cn } from "@/lib/utils";

const adminLinks = [
  { to: "/doctors", label: "Doctors", icon: Users },
  { to: "/specializations", label: "Specializations", icon: Tags },
  { to: "/audit-logs", label: "Audit logs", icon: ScrollText },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
        <Stethoscope className="size-5" />
      </div>
      <span className="text-lg font-semibold tracking-tight">Clinic</span>
    </div>
  );
}

function initialsOf(email: string) {
  return email.slice(0, 2).toUpperCase();
}

/** The nav and account block, rendered both in the fixed desktop rail and the mobile drawer. */
function SidebarContent() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return (
    <>
      <div className="px-5 py-5">
        <Brand />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        <NavLink to="/" end className={linkClass}>
          <LayoutDashboard className="size-4" />
          Dashboard
        </NavLink>
        <NavLink to="/patients" className={linkClass}>
          <HeartPulse className="size-4" />
          Patients
        </NavLink>

        {isAdmin && (
          <>
            <p className="px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Administration
            </p>
            {adminLinks.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initialsOf(user?.email ?? "?")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{user?.email}</span>
                <span className="block text-xs capitalize text-muted-foreground">
                  {user?.role.toLowerCase()}
                </span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-[14rem]">
            <DropdownMenuLabel>Signed in</DropdownMenuLabel>
            <div className="px-2.5 pb-2">
              <p className="break-anywhere text-sm">{user?.email}</p>
              <Badge variant="info" className="mt-1.5 capitalize">
                {user?.role.toLowerCase()}
              </Badge>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => void logout()}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // Navigating from inside the drawer should close it.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-screen lg:flex">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-sidebar/90 px-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2 pl-1">
          <Stethoscope className="size-5 text-primary" />
          <span className="font-semibold tracking-tight">Clinic</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="icon-sm" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu />
          </Button>
        </div>
      </header>

      {/* Mobile drawer: Radix handles focus trapping, scroll lock and Escape. */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DrawerContent className="lg:hidden">
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <SidebarContent />
        </DrawerContent>
      </Dialog>

      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-[17rem] shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
        <SidebarContent />
        <div className="flex items-center justify-between border-t px-5 py-3">
          <span className="text-xs text-muted-foreground">Appearance</span>
          <ThemeToggle />
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {/* Around the page only, so a broken page leaves the navigation usable to get away from it. */}
          <ErrorBoundary resetKey={pathname}>
            {/* Inside the layout, so the navigation stays put while a page's chunk loads. */}
            <Suspense
              fallback={
                <div className="flex justify-center py-24" role="status" aria-label="Loading">
                  <Spinner className="size-6 text-muted-foreground" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
