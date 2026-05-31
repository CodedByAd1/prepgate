import type { User } from "next-auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Bell } from "lucide-react";

interface DashboardHeaderProps {
  user?: User;
  title?: string;
}

export function DashboardHeader({ user, title }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/80 px-5 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 lg:px-6">
      {/* Page title */}
      <div>
        {title && (
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5">
        {/* Notifications placeholder */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          {/* Unread dot */}
          <span className="absolute right-2 top-2 flex h-1.5 w-1.5 rounded-full bg-primary" />
        </button>

        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
