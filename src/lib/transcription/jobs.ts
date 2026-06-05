import { randomUUID } from "crypto";
import type { TranscriptionJob } from "@/lib/types/session";
import { runTranscriptionJob } from "@/lib/transcription/run-transcription-job";
import { loadJob, saveJob } from "@/lib/transcription/job-store";
import { JobError } from "@/lib/transcription/errors";

const jobs = new Map<string, TranscriptionJob>();

function now() {
  return new Date().toISOString();
}

export function createTranscriptionJob() {
  const id = randomUUID();
  const job: TranscriptionJob = {
    id,
    status: "queued",
    progress: 0,
    stage: "queued",
    createdAt: now(),
    updatedAt: now(),
  };
  jobs.set(id, job);
  void saveJob(job);
  return job;
}

async function patchJob(id: string, patch: Partial<TranscriptionJob>) {
  const found = jobs.get(id);
  if (!found) return;
  const updated = { ...found, ...patch, updatedAt: now() };
  jobs.set(id, updated);
  await saveJob(updated);
}

export async function getJob(id: string) {
  const found = jobs.get(id);
  if (found) return found;
  const loaded = await loadJob(id);
  if (loaded) jobs.set(id, loaded);
  return loaded;
}

export async function cancelJob(id: string) {
  await patchJob(id, {
    cancelRequested: true,
    stage: "cancelled",
    status: "cancelled",
    progress: 100,
    errorCode: "job_cancelled",
    error: "Cancelled by user",
  });
}

export async function startTranscriptionJob(
  id: string,
  input: { fileName: string; buffer: Buffer; languageHint?: string },
) {
  await patchJob(id, { status: "processing", stage: "uploading", progress: 10 });
  try {
    const result = await runTranscriptionJob({
      ...input,
      onStage: (stage, progress) => {
        void patchJob(id, { stage, progress });
      },
      shouldCancel: () => Boolean(jobs.get(id)?.cancelRequested),
    });
    await patchJob(id, {
      status: "completed",
      stage: "ready",
      progress: 100,
      mode: result.mode,
      sessionId: result.sessionId,
    });
  } catch (error) {
    if (error instanceof JobError && error.code === "job_cancelled") {
      await patchJob(id, {
        status: "cancelled",
        stage: "cancelled",
        progress: 100,
        errorCode: "job_cancelled",
        error: error.message,
      });
      return;
    }
    await patchJob(id, {
      status: "failed",
      stage: "failed",
      progress: 100,
      errorCode: error instanceof JobError ? error.code : "unknown",
      error: error instanceof Error ? error.message : "Job failed",
    });
  }
}

export async function startTranscriptionJobFromFilePath(
  id: string,
  input: { fileName: string; filePath: string; languageHint?: string },
) {
  await patchJob(id, { status: "processing", stage: "uploading", progress: 10 });
  try {
    const result = await runTranscriptionJob({
      fileName: input.fileName,
      sourceFilePath: input.filePath,
      languageHint: input.languageHint,
      onStage: (stage, progress) => {
        void patchJob(id, { stage, progress });
      },
      shouldCancel: () => Boolean(jobs.get(id)?.cancelRequested),
    });
    await patchJob(id, {
      status: "completed",
      stage: "ready",
      progress: 100,
      mode: result.mode,
      sessionId: result.sessionId,
    });
  } catch (error) {
    if (error instanceof JobError && error.code === "job_cancelled") {
      await patchJob(id, {
        status: "cancelled",
        stage: "cancelled",
        progress: 100,
        errorCode: "job_cancelled",
        error: error.message,
      });
      return;
    }
    await patchJob(id, {
      status: "failed",
      stage: "failed",
      progress: 100,
      errorCode: error instanceof JobError ? error.code : "unknown",
      error: error instanceof Error ? error.message : "Job failed",
    });
  }
}
