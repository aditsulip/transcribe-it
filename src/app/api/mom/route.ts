import { NextResponse } from "next/server";
import { getSession, attachMom } from "@/lib/store/sessions";
import { generateMom } from "@/lib/mom/mom-orchestrator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionId = body?.sessionId as string | undefined;
    const forceRegenerate = Boolean(body?.forceRegenerate);
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    if (session.mom && !forceRegenerate) {
      return NextResponse.json({ session, source: "saved" });
    }

    const generated = await generateMom(session.transcript);
    const updated = await attachMom(sessionId, generated.mom);
    return NextResponse.json({
      session: updated,
      source: generated.source,
      mode: generated.mode,
      qualityScore: generated.qualityScore,
      qualityReasons: generated.qualityReasons,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "MoM generation failed." },
      { status: 500 },
    );
  }
}
