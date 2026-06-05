"use client";

import { useState } from "react";

const defaultTrigger =
  "h-[28px] w-full min-w-0 truncate rounded-[4px] border border-white/25 bg-transparent px-1 py-1 text-center text-[10px] font-normal text-zinc-300 transition-colors hover:border-white/40 hover:bg-white/[0.05] hover:text-zinc-100";

export function DownloadMenu({
  sessionId,
  triggerClassName,
}: {
  sessionId: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative min-w-0 w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClassName ?? defaultTrigger}
      >
        Download
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 min-w-[7rem] max-w-[calc(100vw-2rem)] py-1 text-left shadow-lg backdrop-blur-sm">
          <div className="divide-y divide-white/10 border border-white/10 bg-[var(--sidebar-bg)]/95">
            <a
              href={`/api/session/${sessionId}/export?format=md`}
              className="block px-3 py-2 text-[12px] font-normal text-zinc-300 hover:bg-white/[0.06]"
            >
              .md
            </a>
            <a
              href={`/api/session/${sessionId}/export?format=txt`}
              className="block px-3 py-2 text-[12px] font-normal text-zinc-300 hover:bg-white/[0.06]"
            >
              .txt
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
