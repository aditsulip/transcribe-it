import type { SessionData } from "@/lib/types/session";

function transcriptWithTimestamps(session: SessionData) {
  if (!session.transcript.segments.length) return session.transcript.text;
  const fmt = (seconds: number) => {
    const whole = Math.max(0, Math.floor(seconds));
    const h = Math.floor(whole / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((whole % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(whole % 60)
      .toString()
      .padStart(2, "0");
    return `${h}:${m}:${s}`;
  };
  return session.transcript.segments
    .map((s) => `[${fmt(s.start)}] ${s.text}`)
    .join("\n");
}

export function toMarkdown(session: SessionData) {
  const mom = session.mom;
  const base = [
    `# Meeting Output`,
    ``,
    `- Session ID: ${session.id}`,
    `- File: ${session.fileName}`,
    `- Created: ${session.createdAt}`,
    ``,
  ];

  if (mom) {
    base.push(
      `## Meeting Metadata`,
      `- Title: ${mom.meetingMetadata.title}`,
      `- DateTime: ${mom.meetingMetadata.dateTime}`,
      `- Facilitator: ${mom.meetingMetadata.facilitator}`,
      `- Objective: ${mom.meetingMetadata.objective}`,
      ``,
      `## Executive Summary`,
      ...mom.executiveSummary.map((x) => `- ${x}`),
      ``,
      `## Key Discussion Points`,
      ...mom.keyDiscussionPoints.map((x) => `- ${x}`),
      ``,
      `## Decisions Made`,
      ...mom.decisionsMade.map((x) => `- ${x.decision} | ${x.owner} | ${x.rationale}`),
      ``,
      `## Action Items`,
      ...mom.actionItems.map((x) => `- ${x.task} | ${x.owner} | ${x.dueDate} | ${x.status}`),
      ``,
      `## Risks / Blockers`,
      ...mom.risksBlockers.map((x) => `- ${x.risk} | ${x.impact} | ${x.mitigation}`),
      ``,
      `## Parking Lot`,
      ...mom.parkingLot.map((x) => `- ${x}`),
      ``,
      `## Next Steps`,
      ...mom.nextSteps.map((x) => `- ${x.step} | ${x.owner} | ${x.when}`),
      ``,
    );
  }

  base.push(`## Appendix: Full Transcript`, "", transcriptWithTimestamps(session));
  return base.join("\n");
}

export function toText(session: SessionData) {
  return toMarkdown(session).replace(/^## /gm, "").replace(/^# /gm, "");
}
