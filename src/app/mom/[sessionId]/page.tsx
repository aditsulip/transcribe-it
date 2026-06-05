"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MomSections } from "@/components/mom/MomSections";
import type { ProfessionalMom, TranscriptResult } from "@/lib/types/transcript";

type SessionPayload = {
  id: string;
  transcript: TranscriptResult;
  mom?: ProfessionalMom;
};

export default function MomPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const s = await fetch(`/api/session/${sessionId}`);
        const base = await s.json();
        if (!s.ok) throw new Error(base?.error ?? "Failed to fetch session");

        if (!base.session.mom) {
          const m = await fetch("/api/mom", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          const momData = await m.json();
          if (!m.ok) throw new Error(momData?.error ?? "Failed to generate MoM");
          setSession(momData.session);
        } else {
          setSession(base.session);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    if (sessionId) load();
  }, [sessionId]);

  if (loading) {
    return <main className="min-h-screen bg-black p-8 text-zinc-200">Generating MoM...</main>;
  }
  if (error || !session?.mom) {
    return (
      <main className="min-h-screen bg-black p-8 text-red-300">
        Failed to load MoM: {error || "Session data unavailable"}
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl bg-black px-6 py-10 text-white">
      <header className="mb-8 flex items-center justify-between border-b border-zinc-800 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Professional Meeting Minutes</h1>
        <div className="flex gap-2">
          <Link href="/" className="border border-zinc-700 px-3 py-2 text-sm">
            Transcribe New Audio
          </Link>
          <a
            href={`/api/session/${sessionId}/export?format=md`}
            className="border border-zinc-700 px-3 py-2 text-sm"
          >
            Download .md
          </a>
          <a
            href={`/api/session/${sessionId}/export?format=txt`}
            className="border border-zinc-700 px-3 py-2 text-sm"
          >
            Download .txt
          </a>
        </div>
      </header>
      <MomSections mom={session.mom} />
    </main>
  );
}
