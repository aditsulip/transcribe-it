import type { ProfessionalMom } from "@/lib/types/transcript";

export function isProfessionalMom(value: unknown): value is ProfessionalMom {
  if (!value || typeof value !== "object") return false;
  const v = value as ProfessionalMom;
  return (
    Array.isArray(v.executiveSummary) &&
    Array.isArray(v.keyDiscussionPoints) &&
    Array.isArray(v.decisionsMade) &&
    Array.isArray(v.actionItems) &&
    Array.isArray(v.risksBlockers) &&
    Array.isArray(v.parkingLot) &&
    Array.isArray(v.nextSteps) &&
    typeof v.meetingMetadata?.title === "string"
  );
}
