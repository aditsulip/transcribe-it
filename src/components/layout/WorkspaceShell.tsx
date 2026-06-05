"use client";

import { ReactNode } from "react";

export function WorkspaceShell({
  leftTop,
  leftBottom,
  right,
}: {
  leftTop: ReactNode;
  leftBottom: ReactNode;
  right: ReactNode;
}) {
  return (
    <main className="grid min-h-screen w-full grid-cols-1 text-[var(--foreground)] md:grid-cols-[240px_1fr]">
      <aside
        className="flex min-h-[40vh] flex-col md:min-h-screen"
        style={{ backgroundColor: "var(--sidebar-bg)" }}
      >
        <section className="px-4 py-6">{leftTop}</section>
        <section className="flex-1 overflow-auto px-4 pb-8">{leftBottom}</section>
      </aside>
      <section
        className="min-h-screen px-8 py-8 md:px-12 md:py-10"
        style={{ backgroundColor: "var(--main-bg)" }}
      >
        {right}
      </section>
    </main>
  );
}
