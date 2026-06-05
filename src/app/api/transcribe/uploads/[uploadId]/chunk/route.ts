import { NextResponse } from "next/server";
import { getUploadSession, saveUploadChunk } from "@/lib/transcription/upload-store";
import { JobError } from "@/lib/transcription/errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  try {
    const { uploadId } = await params;
    const session = await getUploadSession(uploadId);
    if (!session) {
      return NextResponse.json({ error: "Upload session not found." }, { status: 404 });
    }
    const formData = await request.formData();
    const indexRaw = formData.get("index");
    const chunk = formData.get("chunk");
    const index = Number(indexRaw);
    if (!Number.isInteger(index) || index < 0 || index >= session.totalChunks) {
      throw new JobError("invalid_audio", "Invalid chunk index.");
    }
    if (!(chunk instanceof File)) {
      throw new JobError("invalid_audio", "Chunk file is required.");
    }
    const bytes = new Uint8Array(await chunk.arrayBuffer());
    await saveUploadChunk(uploadId, index, bytes);
    return NextResponse.json({ ok: true, index });
  } catch (error) {
    const status = error instanceof JobError ? 400 : 500;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to upload chunk.",
        code: error instanceof JobError ? error.code : "unknown",
      },
      { status },
    );
  }
}

