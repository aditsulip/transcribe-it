"use client";

import { useEffect, useRef, useState } from "react";
import { SegmentList } from "@/components/transcript/SegmentList";
import { MomSections } from "@/components/mom/MomSections";
import { WorkspaceShell } from "@/components/layout/WorkspaceShell";
import { HistoryPanel } from "@/components/history/HistoryPanel";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { formatSessionDisplayDate } from "@/lib/format-session-date";
import type {
  ProfessionalMom,
  TranscriptPostProcessMeta,
  TranscriptResult,
} from "@/lib/types/transcript";
import type { SessionData, TranscriptionJob } from "@/lib/types/session";

const MAX_DIRECT_UPLOAD_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? "80");

type SessionHeaderMeta = { fileName: string; createdAt: string };

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 4v10M8 8l4-4 4 4" />
    </svg>
  );
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [mode, setMode] = useState<"single" | "chunked" | "">("single");
  const [transcript, setTranscript] = useState<TranscriptResult | null>(null);
  const [transcriptRaw, setTranscriptRaw] = useState<TranscriptResult | null>(null);
  const [postProcessMeta, setPostProcessMeta] = useState<TranscriptPostProcessMeta | null>(null);
  const [showRawTranscript, setShowRawTranscript] = useState(false);
  const [job, setJob] = useState<TranscriptionJob | null>(null);
  const [history, setHistory] = useState<SessionData[]>([]);
  const [mom, setMom] = useState<ProfessionalMom | null>(null);
  const [momSource, setMomSource] = useState<"ollama" | "heuristic" | "">("");
  const [pendingDeleteSessionId, setPendingDeleteSessionId] = useState("");
  const [jobStartedAt, setJobStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [languageHint, setLanguageHint] = useState("");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [activeSessionMeta, setActiveSessionMeta] = useState<SessionHeaderMeta | null>(null);
  const [openTray, setOpenTray] = useState<{
    mom: boolean;
    raw: boolean;
    timestamp: boolean;
    debug: boolean;
  }>({ mom: false, raw: true, timestamp: false, debug: false });
  const [dragActive, setDragActive] = useState(false);

  const displayMeta: SessionHeaderMeta | null =
    activeSessionMeta ??
    (sessionId ? (history.find((h) => h.id === sessionId) ?? null) : null);
  const sessionViewActive = Boolean(sessionId && transcript);
  const transcriptForView =
    showRawTranscript && transcriptRaw ? transcriptRaw : transcript;

  async function loadHistory() {
    const resp = await fetch("/api/sessions");
    const data = await resp.json();
    if (resp.ok) setHistory(data.sessions ?? []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHistory();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!jobStartedAt) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.round((Date.now() - jobStartedAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [jobStartedAt]);

  function closeSessionView() {
    setSessionId("");
    setTranscript(null);
    setTranscriptRaw(null);
    setPostProcessMeta(null);
    setShowRawTranscript(false);
    setMom(null);
    setMomSource("");
    setMode("");
    setActiveSessionMeta(null);
    setOpenTray({ mom: false, raw: true, timestamp: false, debug: false });
    setJob(null);
    setJobStartedAt(null);
    setError("");
    setFile(null);
  }

  async function onSubmit() {
    if (!file) return;
    setLoading(true);
    setError("");
    setSessionId("");
    setTranscript(null);
    setTranscriptRaw(null);
    setPostProcessMeta(null);
    setShowRawTranscript(false);
    setJob(null);
    setMom(null);
    setMomSource("");
    setActiveSessionMeta(null);
    setOpenTray({ mom: false, raw: true, timestamp: false, debug: false });
    setJobStartedAt(Date.now());
    setElapsedSeconds(0);
    setUploadPercent(0);

    try {
      const fileSizeMb = file.size / (1024 * 1024);
      let jobId = "";
      if (fileSizeMb > MAX_DIRECT_UPLOAD_MB) {
        jobId = await uploadInChunksAndCreateJob(file, languageHint, setUploadPercent);
      } else {
        const form = new FormData();
        form.append("audio", file);
        if (languageHint.trim()) form.append("languageHint", languageHint.trim());
        const create = await fetch("/api/transcribe/jobs", { method: "POST", body: form });
        const created = await create.json();
        if (!create.ok) throw new Error(created?.error ?? "Failed to create job");
        jobId = created.jobId as string;
      }
      setUploadPercent(100);

      let isDone = false;
      while (!isDone) {
        const jr = await fetch(`/api/transcribe/jobs/${jobId}`);
        const jd = await jr.json();
        if (!jr.ok) throw new Error(jd?.error ?? "Job failed");
        const current = jd.job as TranscriptionJob;
        setJob(current);
        if (current.status === "failed" || current.status === "cancelled") {
          throw new Error(current.error ?? "Job stopped");
        }
        if (current.status === "completed" && current.sessionId) {
          const sr = await fetch(`/api/session/${current.sessionId}`);
          const sd = await sr.json();
          if (!sr.ok) throw new Error(sd?.error ?? "Failed to load session");
          const sess = sd.session as SessionData;
          setSessionId(current.sessionId);
          setMode(current.mode ?? "single");
          setTranscript(sess.transcript);
          setTranscriptRaw(sess.transcriptRaw ?? sess.transcript);
          setPostProcessMeta(sess.postProcess ?? null);
          setShowRawTranscript(false);
          setActiveSessionMeta({ fileName: sess.fileName, createdAt: sess.createdAt });
          isDone = true;
          await loadHistory();
          setJobStartedAt(null);
        } else {
          await new Promise((r) => setTimeout(r, 1200));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
      setUploadPercent(0);
    }
  }

  async function copyTranscript(withTimestamps: boolean) {
    if (!transcriptForView) return;
    const content = withTimestamps
      ? transcriptForView.segments.length
        ? transcriptForView.segments.map((s) => `[${Math.floor(s.start)}s] ${s.text}`).join("\n")
        : transcriptForView.text
      : transcriptForView.text;
    await navigator.clipboard.writeText(content);
  }

  async function openSession(sessionIdToOpen: string) {
    const sr = await fetch(`/api/session/${sessionIdToOpen}`);
    const sd = await sr.json();
    if (!sr.ok) throw new Error(sd?.error ?? "Failed to open session");
    const sess = sd.session as SessionData;
    setSessionId(sessionIdToOpen);
    setTranscript(sess.transcript);
    setTranscriptRaw(sess.transcriptRaw ?? sess.transcript);
    setPostProcessMeta(sess.postProcess ?? null);
    setShowRawTranscript(false);
    setMom(sess.mom ?? null);
    setActiveSessionMeta({ fileName: sess.fileName, createdAt: sess.createdAt });
    setOpenTray({
      mom: Boolean(sess.mom),
      raw: !sess.mom,
      timestamp: false,
      debug: false,
    });
  }

  async function generateMom() {
    if (!sessionId) return;
    setLoading(true);
    setError("");
    try {
      const m = await fetch("/api/mom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const md = await m.json();
      if (!m.ok) throw new Error(md?.error ?? "Failed to generate MoM");
      setMom(md.session?.mom ?? null);
      setMomSource(md.source ?? "");
      setOpenTray({ mom: true, raw: true, timestamp: true, debug: false });
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function cancelCurrentJob() {
    if (!job?.id || job.status !== "processing") return;
    await fetch(`/api/transcribe/jobs/${job.id}/cancel`, { method: "POST" });
    setJobStartedAt(null);
  }

  async function confirmDeleteHistory() {
    if (!pendingDeleteSessionId) return;
    await fetch(`/api/sessions/${pendingDeleteSessionId}`, { method: "DELETE" });
    await loadHistory();
    if (sessionId === pendingDeleteSessionId) {
      closeSessionView();
    }
    setPendingDeleteSessionId("");
  }

  function toggleTray(key: "mom" | "raw" | "timestamp" | "debug") {
    setOpenTray((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleDropZoneDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDropZoneDragLeave() {
    setDragActive(false);
  }

  function handleDropZoneDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  const secondaryOutlineBtn =
    "inline-flex items-center justify-center rounded-[6px] border border-white/25 bg-transparent px-4 py-2 text-[13px] font-normal text-zinc-200 transition-colors hover:border-white/40 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40";

  const resultsBlock = (
    <>
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => void generateMom()}
          disabled={!sessionId || loading}
          className={secondaryOutlineBtn}
        >
          Generate MoM
        </button>
        <div className="inline-flex items-center gap-3 text-[12px] font-normal text-zinc-500">
          <span>
            {postProcessMeta?.method === "ai"
              ? "post-processed (AI)"
              : postProcessMeta?.method === "rules"
                ? "post-processed (rules)"
                : "raw from model"}
          </span>
          <button
            type="button"
            onClick={() => setShowRawTranscript((prev) => !prev)}
            disabled={!transcriptRaw}
            className="text-zinc-400 transition-colors hover:text-[var(--accent)] disabled:opacity-40"
          >
            {showRawTranscript ? "Show cleaned" : "Show raw"}
          </button>
        </div>
      </div>

      <div className="divide-y divide-white/10 border-t border-white/10">
        <div>
          <button
            type="button"
            onClick={() => toggleTray("mom")}
            className="flex w-full items-start justify-between gap-4 py-5 text-left"
          >
            <span className="text-[14px] font-normal text-zinc-200">
              MoM result{" "}
              {!mom && <span className="text-zinc-500">(no result)</span>}
            </span>
            <span className="shrink-0 text-[13px] font-normal text-zinc-500 hover:text-[var(--accent)]">
              {openTray.mom ? "Hide" : "Open"}
            </span>
          </button>
          {openTray.mom && (
            <div className="pb-8 pt-2">
              <p className="mb-6 text-[12px] font-normal text-zinc-500">
                Source: {momSource || (mom ? "saved" : "not generated")}
              </p>
              {mom && transcript ? (
                <MomSections mom={mom} />
              ) : (
                <p className="text-[13px] font-normal text-zinc-500">
                  Generate MoM from a transcript first, or open one from history.
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => toggleTray("raw")}
            className="flex w-full items-start justify-between gap-4 py-5 text-left"
          >
            <span className="text-[14px] font-normal text-zinc-200">
              Raw transcript{" "}
              {!transcriptForView?.text && <span className="text-zinc-500">(no result)</span>}
            </span>
            <span className="shrink-0 text-[13px] font-normal text-zinc-500 hover:text-[var(--accent)]">
              {openTray.raw ? "Hide" : "Open"}
            </span>
          </button>
          {openTray.raw && (
            <div className="pb-8 pt-2">
              {transcriptForView ? (
                <>
                  <div className="mb-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void copyTranscript(false)}
                      className="text-[13px] font-normal text-zinc-500 hover:text-[var(--accent)]"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-[14px] font-normal leading-relaxed text-zinc-300">
                    {transcriptForView.text}
                  </p>
                </>
              ) : (
                <p className="text-[13px] font-normal text-zinc-500">
                  No transcript yet. Upload audio or open one from history.
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => toggleTray("timestamp")}
            className="flex w-full items-start justify-between gap-4 py-5 text-left"
          >
            <span className="text-[14px] font-normal text-zinc-200">
              Transcript with timestamps{" "}
              {!transcriptForView?.segments?.length && (
                <span className="text-zinc-500">(no result)</span>
              )}
            </span>
            <span className="shrink-0 text-[13px] font-normal text-zinc-500 hover:text-[var(--accent)]">
              {openTray.timestamp ? "Hide" : "Open"}
            </span>
          </button>
          {openTray.timestamp && (
            <div className="pb-8 pt-2">
              {transcriptForView ? (
                <>
                  <div className="mb-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void copyTranscript(true)}
                      className="text-[13px] font-normal text-zinc-500 hover:text-[var(--accent)]"
                    >
                      Copy with timestamps
                    </button>
                  </div>
                  <SegmentList segments={transcriptForView.segments} />
                </>
              ) : (
                <p className="text-[13px] font-normal text-zinc-500">
                  No timestamped transcript yet.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-16 border-t border-white/10 pt-8">
        <button
          type="button"
          onClick={() => toggleTray("debug")}
          className="text-[12px] font-normal text-zinc-600 hover:text-zinc-400"
        >
          {openTray.debug ? "Hide diagnostics" : "Show diagnostics"}
        </button>
        {openTray.debug && (
          <div className="mt-6 space-y-2 text-[12px] font-normal text-zinc-500">
            <p className="font-medium text-zinc-400">Diagnostics</p>
            <p>Job ID: {job?.id ?? "—"}</p>
            <p>Stage: {job?.stage ?? "—"}</p>
            <p>Progress: {job?.progress ?? 0}%</p>
            <p>Error code: {job?.errorCode ?? "—"}</p>
            <p>Error: {job?.error ?? "—"}</p>
            <p>Processing mode: {mode || "—"}</p>
            <p>Post-process: {postProcessMeta?.method ?? "raw"}</p>
            <p>Post-process provider: {postProcessMeta?.provider ?? "—"}</p>
            <p>Post-process latency: {postProcessMeta?.latencyMs ?? "—"} ms</p>
            <p>Quality score: {postProcessMeta?.qualityScore ?? "—"}</p>
            <p>Quality reasons: {postProcessMeta?.reasons?.join(" | ") || "—"}</p>
            <p>Post-process notes: {postProcessMeta?.notes?.join(" | ") || "—"}</p>
            <p>MoM source: {momSource || (mom ? "saved" : "—")}</p>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <WorkspaceShell
        leftTop={
          <div className="space-y-3">
            <h1 className="text-[16px] font-medium tracking-tight text-zinc-100">Transcribe It</h1>
            <p className="text-[12px] font-normal leading-relaxed text-zinc-500">
              Upload, transcribe, and review minutes in one calm view.
            </p>
          </div>
        }
        leftBottom={
          <div className="min-w-0">
            <h2 className="mb-4 text-[11px] font-normal text-zinc-500">History (7 days)</h2>
            <HistoryPanel
              sessions={history}
              activeSessionId={sessionId}
              onOpen={(id) => {
                void openSession(id);
              }}
              onDelete={(id) => {
                setPendingDeleteSessionId(id);
              }}
            />
          </div>
        }
        right={
          <div className="flex min-h-screen flex-col">
            {sessionViewActive ? (
              <>
                <header
                  className="sticky top-0 z-20 -mx-8 mb-8 flex items-start gap-4 border-b border-white/10 bg-[var(--main-bg)]/95 px-8 py-4 backdrop-blur-sm md:-mx-12 md:px-12"
                >
                  <div className="min-w-0 flex-1">
                    {displayMeta ? (
                      <>
                        <p className="truncate text-[15px] font-medium text-zinc-100">
                          {displayMeta.fileName}
                        </p>
                        <p className="mt-1 text-[12px] font-normal text-zinc-500">
                          {formatSessionDisplayDate(displayMeta.createdAt)}
                        </p>
                      </>
                    ) : (
                      <p className="text-[15px] font-medium text-zinc-100">Session</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={closeSessionView}
                    className="shrink-0 rounded-[6px] border border-white/20 px-3 py-2 text-[13px] font-normal text-zinc-300 transition-colors hover:border-white/35 hover:bg-white/[0.06] hover:text-zinc-100"
                  >
                    ✕ Close
                  </button>
                </header>
                <div className="flex-1">{resultsBlock}</div>
              </>
            ) : (
              <div className="flex-1">
                <div
                  onDragOver={handleDropZoneDragOver}
                  onDragLeave={handleDropZoneDragLeave}
                  onDrop={handleDropZoneDrop}
                  className={`w-full border border-dashed py-12 text-center transition-colors ${
                    dragActive ? "border-white/25" : "border-white/15"
                  }`}
                >
                  <input
                    id="upload-file"
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,video/mp4,video/x-matroska,.mp4,.mkv"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                  <label htmlFor="upload-file" className="block cursor-pointer px-4">
                    <UploadIcon className="mx-auto mb-6 text-zinc-500" />
                    <p className="text-[14px] font-normal text-zinc-200">
                      Drop audio or video file here
                    </p>
                    <p className="mt-2 text-[12px] font-normal text-zinc-500">
                      Accepted: audio/*, .mp4, .mkv — max direct upload 80MB
                    </p>
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-6 rounded-[6px] border border-white/20 px-3 py-1.5 text-[12px] font-normal text-zinc-300 hover:border-white/35 hover:text-zinc-100"
                  >
                    Choose file
                  </button>
                  {file && (
                    <p className="mt-6 truncate px-4 text-[13px] font-normal text-zinc-400">
                      {file.name}
                    </p>
                  )}
                </div>

                <div className="mt-8 flex min-w-0 flex-wrap items-end gap-4">
                  <div className="min-w-0 flex-1 basis-[12rem]">
                    <label
                      htmlFor="language-hint"
                      className="mb-2 block text-[12px] font-normal text-zinc-500"
                    >
                      Language hint (optional)
                    </label>
                    <input
                      id="language-hint"
                      value={languageHint}
                      onChange={(e) => setLanguageHint(e.target.value)}
                      placeholder="Leave empty for auto"
                      className="w-full rounded-[6px] border border-white/10 bg-transparent px-3 py-2.5 text-[14px] font-normal text-zinc-200 placeholder:text-zinc-600 focus:border-white/20 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={!file || loading}
                    className="h-[42px] w-40 shrink-0 rounded-[6px] text-[14px] font-normal text-zinc-950 transition-opacity disabled:opacity-40"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    {loading ? "Processing…" : "Upload & process"}
                  </button>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-6">
                  {job?.status === "processing" && (
                    <button
                      type="button"
                      onClick={() => void cancelCurrentJob()}
                      className="text-[13px] font-normal text-zinc-500 hover:text-zinc-300"
                    >
                      Cancel job
                    </button>
                  )}
                </div>

                {job && (
                  <div className="mt-6 text-[12px] font-normal text-zinc-500">
                    <p>
                      {job.stage} · {job.progress}%
                      {job.errorCode ? ` · ${job.errorCode}` : ""}
                    </p>
                    {job.status === "processing" && (
                      <p className="mt-2">
                        {elapsedSeconds}s elapsed — long audio may take several minutes.
                      </p>
                    )}
                  </div>
                )}
                {!job && loading && uploadPercent > 0 && uploadPercent < 100 && (
                  <p className="mt-6 text-[12px] font-normal text-zinc-500">
                    Uploading large file: {uploadPercent}%
                  </p>
                )}
                {error && (
                  <p className="mt-6 text-[13px] font-normal text-red-400/90">{error}</p>
                )}
              </div>
            )}
          </div>
        }
      />
      <ConfirmDialog
        open={Boolean(pendingDeleteSessionId)}
        title="Delete history item?"
        description="This will remove the saved transcript and MoM cache for this item."
        confirmLabel="Delete"
        cancelLabel="Keep"
        onCancel={() => setPendingDeleteSessionId("")}
        onConfirm={() => {
          void confirmDeleteHistory();
        }}
      />
    </>
  );
}

async function uploadInChunksAndCreateJob(
  file: File,
  languageHint: string,
  onProgress: (percent: number) => void,
) {
  const initResp = await fetch("/api/transcribe/uploads/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    }),
  });
  const initData = await initResp.json();
  if (!initResp.ok) throw new Error(initData?.error ?? "Failed to initialize chunked upload");

  const uploadId = initData.uploadId as string;
  const chunkSizeBytes = Number(initData.chunkSizeBytes);
  const totalChunks = Number(initData.totalChunks);
  if (!uploadId || !Number.isFinite(chunkSizeBytes) || chunkSizeBytes <= 0) {
    throw new Error("Invalid chunked upload configuration.");
  }

  for (let index = 0; index < totalChunks; index += 1) {
    const start = index * chunkSizeBytes;
    const end = Math.min(file.size, start + chunkSizeBytes);
    const blob = file.slice(start, end);
    const form = new FormData();
    form.append("index", `${index}`);
    form.append("chunk", blob, `${file.name}.part`);
    const chunkResp = await fetch(`/api/transcribe/uploads/${uploadId}/chunk`, {
      method: "POST",
      body: form,
    });
    const chunkData = await chunkResp.json();
    if (!chunkResp.ok) throw new Error(chunkData?.error ?? `Failed to upload chunk ${index + 1}`);
    onProgress(Math.round(((index + 1) / totalChunks) * 100));
  }

  const completeResp = await fetch(`/api/transcribe/uploads/${uploadId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      languageHint: languageHint.trim() ? languageHint.trim() : undefined,
    }),
  });
  const completeData = await completeResp.json();
  if (!completeResp.ok) throw new Error(completeData?.error ?? "Failed to finalize upload");
  return completeData.jobId as string;
}
