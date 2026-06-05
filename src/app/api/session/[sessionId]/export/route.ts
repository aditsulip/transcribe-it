import { NextResponse } from "next/server";
import { getSession } from "@/lib/store/sessions";
import { toMarkdown, toText } from "@/lib/export/formatters";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "md").toLowerCase();
  const isTxt = format === "txt";
  const content = isTxt ? toText(session) : toMarkdown(session);
  const ext = isTxt ? "txt" : "md";

  return new NextResponse(content, {
    headers: {
      "Content-Type": isTxt ? "text/plain; charset=utf-8" : "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="meeting-${sessionId}.${ext}"`,
    },
  });
}
