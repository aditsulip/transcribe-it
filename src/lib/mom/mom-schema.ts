import type { ProfessionalMom } from "@/lib/types/transcript";

export const emptyMom: ProfessionalMom = {
  meetingMetadata: {
    title: "Meeting Notes",
    dateTime: new Date().toISOString(),
    attendees: [],
    facilitator: "TBD",
    objective: "Review discussion and align next actions.",
  },
  executiveSummary: [],
  keyDiscussionPoints: [],
  decisionsMade: [],
  actionItems: [],
  risksBlockers: [],
  parkingLot: [],
  nextSteps: [],
};
