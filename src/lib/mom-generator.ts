import type { ProfessionalMom, TranscriptResult } from "@/lib/types/transcript";
import { emptyMom } from "@/lib/mom/mom-schema";

function sentenceChunks(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function generateProfessionalMom(transcript: TranscriptResult): ProfessionalMom {
  const mom: ProfessionalMom = structuredClone(emptyMom);
  const chunks = sentenceChunks(transcript.text);

  mom.executiveSummary = chunks.slice(0, 6);
  mom.keyDiscussionPoints = chunks.slice(0, 12);
  mom.decisionsMade = chunks.slice(0, 3).map((c, idx) => ({
    decision: c,
    rationale: "Captured from discussion context.",
    owner: idx === 0 ? "Facilitator" : "Team",
  }));
  mom.actionItems = chunks.slice(0, 5).map((c, idx) => ({
    task: c,
    owner: "TBD",
    dueDate: "TBD",
    priority: idx === 0 ? "High" : "Medium",
    status: "Open",
  }));
  mom.risksBlockers = [
    {
      risk: "Action owners are not explicitly identified.",
      impact: "Execution may be delayed.",
      mitigation: "Assign owner and due date during review.",
    },
  ];
  mom.parkingLot = ["Topics requiring deeper technical validation."];
  mom.nextSteps = [
    {
      step: "Review and confirm all action items.",
      owner: "Meeting facilitator",
      when: "Within 24 hours",
    },
  ];

  return mom;
}
