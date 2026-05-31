"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  FileQuestion,
  ClipboardCheck,
  Bot,
  BarChart3,
  TrendingUp,
  Lightbulb,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  {
    group: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    group: "Study",
    items: [
      { href: "/lectures", label: "Lecture Hub", icon: BookOpen },
      { href: "/pyq", label: "PYQ Practice", icon: FileQuestion },
      { href: "/mock-tests", label: "Mock Tests", icon: ClipboardCheck },
      { href: "/ai-tutor", label: "AI Tutor", icon: Bot, badge: "AI" },
    ],
  },
  {
    group: "Insights",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/progress", label: "Progress", icon: TrendingUp },
      { href: "/recommendations", label: "Recommendations", icon: Lightbulb },
    ],
  },
  {
    group: "Account",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sidebar relative hidden flex-col transition-all duration-300 ease-in-out lg:flex",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Logo area */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border px-4",
          collapsed ? "justify-center" : "gap-2.5 px-5"
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg gradient-brand shadow-sm">
          <span className="text-sm font-extrabold text-white">PG</span>
        </div>
        {!collapsed && (
          <span className="text-base font-bold text-foreground">
            Prep<span className="gradient-text">Gate</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {navItems.map((group) => (
          <div key={group.group}>
            {!collapsed && (
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group.group}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "sidebar-item flex items-center gap-3 px-2.5 py-2 text-sm",
                        collapsed ? "justify-center px-2" : "",
                        isActive
                          ? "active"
                          : "text-muted-foreground"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4.5 w-4.5 shrink-0",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {"badge" in item && item.badge && (
                            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className={cn(
            "sidebar-item flex w-full items-center gap-2.5 px-2.5 py-2 text-xs text-muted-foreground",
            collapsed ? "justify-center" : ""
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
