import { NextResponse } from "next/server";
import { cleanupExpiredSessions, listSessions } from "@/lib/store/sessions";

let cleanupStarted = false;

function ensureCleanupLoop() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  void cleanupExpiredSessions();
  setInterval(() => {
    void cleanupExpiredSessions();
  }, 6 * 60 * 60 * 1000);
}

export async function GET() {
  ensureCleanupLoop();
  const sessions = await listSessions();
  return NextResponse.json({ sessions });
}
