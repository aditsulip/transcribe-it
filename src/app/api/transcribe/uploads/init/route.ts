import { NextResponse } from "next/server";
import { JobError } from "@/lib/transcription/errors";
import { createUploadSession } from "@/lib/transcription/upload-store";
import {
  CHUNK_SIZE_BYTES,
  isAcceptedAudioType,
  MAX_CHUNK_UPLOAD_MB,
  sanitizeUploadFileName,
} from "@/lib/transcription/upload-constants";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
    };
    const fileName = String(body.fileName ?? "");
    const fileSize = Number(body.fileSize ?? 0);
    const mimeType = String(body.mimeType ?? "");

    if (!fileName || !Number.isFinite(fileSize) || fileSize <= 0) {
      throw new JobError("invalid_audio", "Invalid upload metadata.");
    }
    if (!isAcceptedAudioType(fileName, mimeType)) {
      throw new JobError("invalid_audio", "Only audio/*, .mp4, or .mkv files are allowed.");
    }
    const sizeMb = fileSize / (1024 * 1024);
    if (sizeMb > MAX_CHUNK_UPLOAD_MB) {
      throw new JobError("file_too_large", `Max chunked upload size is ${MAX_CHUNK_UPLOAD_MB}MB.`);
    }

    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE_BYTES);
    const session = await createUploadSession({
      fileName: sanitizeUploadFileName(fileName),
      fileSize,
      mimeType,
      totalChunks,
    });
    return NextResponse.json({
      uploadId: session.id,
      chunkSizeBytes: CHUNK_SIZE_BYTES,
      totalChunks: session.totalChunks,
    });
  } catch (error) {
    const status = error instanceof JobError ? 400 : 500;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to initialize upload.",
        code: error instanceof JobError ? error.code : "unknown",
      },
      { status },
    );
  }
}

