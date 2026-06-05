import { NextResponse } from "next/server";
import { runTranscriptionJob } from "@/lib/transcription/run-transcription-job";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
    }

    const buffer = Buffer.from(await audio.arrayBuffer());
    const result = await runTranscriptionJob({
      fileName: audio.name,
      buffer,
    });

    return NextResponse.json({
      sessionId: result.sessionId,
      mode: result.mode,
      transcript: result.transcript,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transcription failed." },
      { status: 500 },
    );
  }
}
