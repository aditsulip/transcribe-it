import { NextResponse } from "next/server";
import { cancelJob } from "@/lib/transcription/jobs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  await cancelJob(jobId);
  return NextResponse.json({ ok: true });
}
