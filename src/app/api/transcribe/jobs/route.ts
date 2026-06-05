import { NextResponse } from "next/server";
import {
  createTranscriptionJob,
  startTranscriptionJob,
} from "@/lib/transcription/jobs";
import { JobError } from "@/lib/transcription/errors";
import {
  isAcceptedAudioType,
  MAX_UPLOAD_MB,
  sanitizeUploadFileName,
} from "@/lib/transcription/upload-constants";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    if (!(audio instanceof File)) {
      throw new JobError("invalid_audio", "Audio file is required.");
    }
    if (!isAcceptedAudioType(audio.name, audio.type)) {
      throw new JobError("invalid_audio", "Only audio/*, .mp4, or .mkv files are allowed.");
    }
    const sizeMb = audio.size / (1024 * 1024);
    if (sizeMb > MAX_UPLOAD_MB) {
      throw new JobError("file_too_large", `Max file size is ${MAX_UPLOAD_MB}MB.`);
    }

    const buffer = Buffer.from(await audio.arrayBuffer());
    const safeName = sanitizeUploadFileName(audio.name);
    const languageHintRaw = formData.get("languageHint");
    const languageHint =
      typeof languageHintRaw === "string" && languageHintRaw.trim()
        ? languageHintRaw.trim().slice(0, 16)
        : undefined;
    const job = createTranscriptionJob();
    void startTranscriptionJob(job.id, { fileName: safeName, buffer, languageHint });
    return NextResponse.json({ jobId: job.id });
  } catch (error) {
    const status = error instanceof JobError ? 400 : 500;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create job.",
        code: error instanceof JobError ? error.code : "unknown",
      },
      { status },
    );
  }
}
