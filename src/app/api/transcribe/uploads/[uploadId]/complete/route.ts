import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createTranscriptionJob, startTranscriptionJobFromFilePath } from "@/lib/transcription/jobs";
import { JobError } from "@/lib/transcription/errors";
import {
  assembleUploadToFile,
  deleteUploadSession,
  getUploadSession,
} from "@/lib/transcription/upload-store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  const { uploadId } = await params;
  let assembledFilePath = "";
  try {
    const session = await getUploadSession(uploadId);
    if (!session) {
      return NextResponse.json({ error: "Upload session not found." }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as { languageHint?: string };
    const languageHint =
      typeof body.languageHint === "string" && body.languageHint.trim()
        ? body.languageHint.trim().slice(0, 16)
        : undefined;

    assembledFilePath = path.join(os.tmpdir(), `upload-merged-${randomUUID()}-${session.fileName}`);
    await assembleUploadToFile(uploadId, assembledFilePath);
    await deleteUploadSession(uploadId);

    const job = createTranscriptionJob();
    void startTranscriptionJobFromFilePath(job.id, {
      fileName: session.fileName,
      filePath: assembledFilePath,
      languageHint,
    }).finally(async () => {
      await fs.rm(assembledFilePath, { force: true });
    });

    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    if (assembledFilePath) {
      await fs.rm(assembledFilePath, { force: true });
    }
    const status = error instanceof JobError ? 400 : 500;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to complete upload.",
        code: error instanceof JobError ? error.code : "unknown",
      },
      { status },
    );
  }
}

