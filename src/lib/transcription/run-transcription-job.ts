import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { transcribeWithWhisperOptions } from "@/lib/whisper-client";
import {
  getDurationSeconds,
  shouldChunk,
  splitAudioIntoChunks,
  splitAudioByWindowWithoutDuration,
} from "@/lib/audio/chunking";
import { shouldNormalizeForWhisper, transcodeToWhisperWav } from "@/lib/audio/normalize";
import { stitchChunkTranscripts } from "@/lib/audio/stitching";
import { saveSession } from "@/lib/store/sessions";
import { withRetry } from "@/lib/transcription/retry";
import { JobError } from "@/lib/transcription/errors";
import { runTranscriptPostProcess } from "@/lib/transcript-postprocess";

const CHUNK_FALLBACK_FILESIZE_MB = Number(
  process.env.CHUNK_FALLBACK_FILESIZE_MB ?? "20",
);

function isUnsupportedRemoteFileTypeMessage(message: string) {
  return message.toLowerCase().includes("unsupported file type");
}

export async function runTranscriptionJob(input: {
  fileName: string;
  buffer?: Buffer;
  sourceFilePath?: string;
  languageHint?: string;
  onStage?: (stage: "chunking" | "transcribing" | "saving", progress: number) => void;
  shouldCancel?: () => boolean;
}) {
  const ownedInputPath = path.join(os.tmpdir(), `upload-${randomUUID()}-${input.fileName}`);
  const inputPath = input.sourceFilePath ?? ownedInputPath;
  const shouldDeleteInputPath = !input.sourceFilePath;
  let chunkTempDir = "";
  try {
    if (input.buffer && input.sourceFilePath) {
      throw new JobError("unknown", "Provide either buffer or sourceFilePath, not both.");
    }
    if (!input.buffer && !input.sourceFilePath) {
      throw new JobError("invalid_audio", "Audio source is required.");
    }
    if (input.buffer) {
      await fs.writeFile(inputPath, input.buffer);
    }
    let durationSeconds = 0;
    let durationProbeFailed = false;
    try {
      durationSeconds = await getDurationSeconds(inputPath);
    } catch {
      durationProbeFailed = true;
      durationSeconds = 0;
    }

    let transcript;
    let mode: "single" | "chunked" = "single";
    const bytesForFallback =
      input.buffer?.length ?? (await fs.stat(inputPath)).size;
    const isLikelyLarge = bytesForFallback / (1024 * 1024) >= CHUNK_FALLBACK_FILESIZE_MB;
    const extension = path.extname(input.fileName).toLowerCase();
    const shouldForceChunkFallback =
      durationProbeFailed && isLikelyLarge && [".mp4", ".mkv", ".m4a", ".wav", ".mp3"].includes(extension);
    if (durationSeconds > 0 && shouldChunk(durationSeconds)) {
      input.onStage?.("chunking", 20);
      mode = "chunked";
      const { tempDir, chunks } = await splitAudioIntoChunks(inputPath, durationSeconds);
      chunkTempDir = tempDir;
      const chunkResults = [];
      for (const c of chunks) {
        if (input.shouldCancel?.()) {
          throw new JobError("job_cancelled", "Job was cancelled by user.");
        }
        input.onStage?.("transcribing", Math.min(90, 30 + Math.round((c.index / chunks.length) * 60)));
        const partial = await withRetry(
          () =>
            transcribeWithWhisperOptions({
              filePath: c.path,
              fileName: `chunk-${c.index}.wav`,
              languageHint: input.languageHint,
            }),
          { retries: 2, delayMs: 1200 },
        );
        chunkResults.push({
          chunkIndex: c.index,
          chunkStartSec: c.startSec,
          segments: partial.segments,
        });
      }
      transcript = stitchChunkTranscripts(chunkResults);
    } else if (shouldForceChunkFallback) {
      input.onStage?.("chunking", 20);
      mode = "chunked";
      const { tempDir, chunks } = await splitAudioByWindowWithoutDuration(inputPath);
      chunkTempDir = tempDir;
      const chunkResults = [];
      for (const c of chunks) {
        if (input.shouldCancel?.()) {
          throw new JobError("job_cancelled", "Job was cancelled by user.");
        }
        input.onStage?.("transcribing", Math.min(90, 30 + Math.round((c.index / chunks.length) * 60)));
        const partial = await withRetry(
          () =>
            transcribeWithWhisperOptions({
              filePath: c.path,
              fileName: `chunk-${c.index}.wav`,
              languageHint: input.languageHint,
            }),
          { retries: 2, delayMs: 1200 },
        );
        chunkResults.push({
          chunkIndex: c.index,
          chunkStartSec: c.startSec,
          segments: partial.segments,
        });
      }
      transcript = stitchChunkTranscripts(chunkResults);
    } else {
      input.onStage?.("transcribing", 55);
      let normalizedSinglePath = "";
      try {
        const initialPath = shouldNormalizeForWhisper(input.fileName)
          ? await transcodeToWhisperWav(inputPath)
          : inputPath;
        normalizedSinglePath = initialPath === inputPath ? "" : initialPath;
        transcript = await transcribeWithWhisperOptions({
          filePath: initialPath,
          fileName: initialPath === inputPath ? input.fileName : "single-normalized.wav",
          languageHint: input.languageHint,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Single transcription failed";
        if (!normalizedSinglePath && isUnsupportedRemoteFileTypeMessage(message)) {
          normalizedSinglePath = await transcodeToWhisperWav(inputPath);
          transcript = await transcribeWithWhisperOptions({
            filePath: normalizedSinglePath,
            fileName: "single-normalized.wav",
            languageHint: input.languageHint,
          });
        } else if (durationProbeFailed) {
          throw new JobError(
            "duration_probe_failed",
            `Duration probe failed and single transcription failed: ${message}`,
          );
        } else {
          throw new JobError("single_transcribe_failed", message);
        }
      } finally {
        if (normalizedSinglePath) {
          await fs.rm(normalizedSinglePath, { force: true });
        }
      }
    }

    const postProcessed = await runTranscriptPostProcess(transcript);
    const sessionId = randomUUID();
    input.onStage?.("saving", 95);
    await saveSession({
      id: sessionId,
      fileName: input.fileName,
      createdAt: new Date().toISOString(),
      transcript: postProcessed.transcriptDisplay,
      transcriptRaw: postProcessed.transcriptRaw,
      transcriptCleaned: postProcessed.transcriptCleaned,
      postProcess: postProcessed.postProcess,
    });
    return { sessionId, mode, transcript: postProcessed.transcriptDisplay };
  } catch (error) {
    if (error instanceof JobError) throw error;
    const message = error instanceof Error ? error.message : "Unknown job error";
    if (message.includes("spawn ffmpeg ENOENT") || message.includes("spawn ffprobe ENOENT")) {
      throw new JobError("ffmpeg_not_found", message);
    }
    if (message.toLowerCase().includes("whisper request failed")) {
      throw new JobError("whisper_request_failed", message);
    }
    throw new JobError("unknown", message);
  } finally {
    if (shouldDeleteInputPath) {
      await fs.rm(inputPath, { force: true });
    }
    if (chunkTempDir) await fs.rm(chunkTempDir, { recursive: true, force: true });
  }
}
