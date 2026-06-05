import { readFile } from "fs/promises";
import path from "path";
import type { TranscriptResult } from "@/lib/types/transcript";

const WHISPER_API_BASE_URL =
  process.env.WHISPER_API_BASE_URL ?? "http://192.168.0.251:8091";
const WHISPER_TIMEOUT_MS = Number(process.env.WHISPER_TIMEOUT_MS ?? "180000");

export async function transcribeWithWhisper(filePath: string, fileName: string) {
  return transcribeWithWhisperOptions({ filePath, fileName });
}

export async function transcribeWithWhisperOptions(input: {
  filePath: string;
  fileName: string;
  languageHint?: string;
}) {
  const fileBuffer = await readFile(input.filePath);
  const form = new FormData();
  const blob = new Blob([fileBuffer], { type: "audio/wav" });
  form.append("file", blob, path.basename(input.fileName));
  if (input.languageHint && input.languageHint.trim()) {
    form.append("language", input.languageHint.trim());
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WHISPER_TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(`${WHISPER_API_BASE_URL}/transcribe-detailed`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Whisper request failed";
    throw new Error(`Whisper request failed: ${message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    const detail = (await resp.text()).trim();
    throw new Error(
      detail ? `Whisper API failed: ${resp.status} - ${detail}` : `Whisper API failed: ${resp.status}`,
    );
  }

  const data = await resp.json();
  return normalizeWhisperResponse(data);
}

function normalizeWhisperResponse(data: unknown): TranscriptResult {
  type WhisperSegment = { start?: number; end?: number; text?: string };
  type WhisperPayload = {
    text?: string;
    full_text?: string;
    language?: string;
    duration?: number;
    segments?: WhisperSegment[];
  };

  const payload = data as WhisperPayload;
  const segments = Array.isArray(payload?.segments)
    ? payload.segments.map((s) => ({
        start: Number(s.start ?? 0),
        end: Number(s.end ?? 0),
        text: String(s.text ?? ""),
      }))
    : [];

  return {
    text: String(payload?.full_text ?? payload?.text ?? ""),
    segments,
    durationSeconds:
      typeof payload?.duration === "number" ? payload.duration : undefined,
  };
}
