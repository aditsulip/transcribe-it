import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/store/sessions";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  await deleteSession(sessionId);
  return NextResponse.json({ ok: true });
}
