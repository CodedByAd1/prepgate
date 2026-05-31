import { Navbar } from "@/components/layout/navbar";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-brand">
                <span className="text-xs font-bold text-white">PG</span>
              </div>
              <span className="text-sm font-semibold text-foreground">PrepGate</span>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} PrepGate. Built for GATE CSE aspirants.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
