"use client";

import { signOut } from "next-auth/react";
import type { User } from "next-auth";
import { getInitials } from "@/lib/utils";
import {
  LayoutDashboard,
  LogOut,
  Settings,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

interface UserMenuProps {
  user?: User;
}

export function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-border transition-all duration-200 hover:ring-primary/40 overflow-hidden"
        aria-label="Open user menu"
      >
        {user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name ?? "User"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center gradient-brand text-xs font-bold text-white">
            {getInitials(user?.name)}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 animate-fade-up overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          {/* User info */}
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold text-foreground">
              {user?.name ?? "User"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email}
            </p>
          </div>

          {/* Menu items */}
          <div className="p-1.5">
            {[
              { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
              { href: "/dashboard/profile", label: "Profile", Icon: UserIcon },
              { href: "/dashboard/settings", label: "Settings", Icon: Settings },
            ].map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors duration-150 hover:bg-muted"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                {label}
              </Link>
            ))}
          </div>

          <div className="border-t border-border p-1.5">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors duration-150 hover:bg-destructive/8"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
