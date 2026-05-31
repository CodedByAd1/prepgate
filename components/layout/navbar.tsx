import Link from "next/link";
import { auth } from "@/lib/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";

export async function Navbar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand shadow-sm transition-transform duration-200 group-hover:scale-105">
            <span className="text-sm font-extrabold text-white">PG</span>
          </div>
          <span className="text-lg font-bold text-foreground">
            Prep<span className="gradient-text">Gate</span>
          </span>
        </Link>

        {/* Nav links — desktop */}
        <nav className="hidden items-center gap-1 md:flex">
          {[
            { href: "#features", label: "Features" },
            { href: "#subjects", label: "Subjects" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session ? (
            <UserMenu user={session.user} />
          ) : (
            <Link
              href="/login"
              className="rounded-lg gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:opacity-90"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
