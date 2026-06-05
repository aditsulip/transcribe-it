"use client";

import type { SessionData } from "@/lib/types/session";
import { DownloadMenu } from "@/components/common/DownloadMenu";
import { formatSessionDisplayDate } from "@/lib/format-session-date";

const ghostBtn =
  "h-[28px] w-full min-w-0 truncate rounded-[4px] border border-white/25 bg-transparent px-1 py-1 text-center text-[10px] font-normal text-zinc-300 transition-colors hover:border-white/40 hover:bg-white/[0.05] hover:text-zinc-100";

export function HistoryPanel({
  sessions,
  onOpen,
  onDelete,
  activeSessionId,
}: {
  sessions: SessionData[];
  onOpen: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  activeSessionId?: string;
}) {
  return (
    <div className="min-w-0 divide-y divide-white/10">
      {sessions.map((s) => {
        const active = s.id === activeSessionId;
        return (
          <div
            key={s.id}
            className={`min-w-0 py-4 pl-3 pr-2 transition-colors ${
              active
                ? "border-l-[3px] border-[var(--accent)] bg-white/[0.07]"
                : "border-l-[3px] border-transparent hover:bg-white/[0.06]"
            }`}
          >
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={`min-w-0 max-w-full truncate text-[13px] font-medium ${
                  active ? "text-white" : "text-zinc-100"
                }`}
                title={s.fileName}
              >
                {s.fileName}
              </span>
              {active && (
                <span className="shrink-0 rounded-full border border-[var(--accent)]/50 bg-[var(--accent)]/15 px-2 py-0.5 text-[10px] font-normal leading-none text-[var(--accent)]">
                  Viewing
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] font-normal text-zinc-500">
              {formatSessionDisplayDate(s.createdAt)}
            </p>
            <div className="mt-3 grid min-w-0 grid-cols-3 gap-1">
              <button type="button" onClick={() => onOpen(s.id)} className={ghostBtn}>
                Open
              </button>
              <DownloadMenu
                sessionId={s.id}
                triggerClassName={ghostBtn}
              />
              <button
                type="button"
                onClick={() => onDelete(s.id)}
                className="h-[28px] w-full min-w-0 truncate rounded-[4px] border border-red-400/55 bg-transparent px-1 py-1 text-center text-[10px] font-normal text-red-400 transition-colors hover:border-red-400 hover:bg-red-500/10 hover:text-red-300"
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
