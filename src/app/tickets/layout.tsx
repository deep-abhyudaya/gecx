import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support Tickets gecX",
  description: "Submit a support ticket or check your ticket status. No login required.",
};

export default function TicketsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-y-auto bg-background text-foreground font-sans custom-scrollbar">
      {/* Minimal branded header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-[15px] tracking-tight">gecX</span>
            <span className="text-[11px] text-muted-foreground"></span>
          </div>
          <a
            href="/"
            className="text-base font-bold bg-white text-black px-6 py-2 rounded-[1rem] transition-all hover:scale-105 active:scale-95 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/40"
          >
            Sign In
          </a>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
