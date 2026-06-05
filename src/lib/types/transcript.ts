export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
  chunkId?: number;
};

export type TranscriptResult = {
  text: string;
  segments: TranscriptSegment[];
  durationSeconds?: number;
};

export type TranscriptPostProcessMeta = {
  applied: boolean;
  qualityScore: number;
  reasons: string[];
  method?: "raw" | "rules" | "ai";
  provider?: "ollama" | "none";
  latencyMs?: number;
  notes?: string[];
};

export type MomActionItem = {
  task: string;
  owner: string;
  dueDate: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Done";
};

export type ProfessionalMom = {
  meetingMetadata: {
    title: string;
    dateTime: string;
    attendees: string[];
    facilitator: string;
    objective: string;
  };
  executiveSummary: string[];
  keyDiscussionPoints: string[];
  decisionsMade: Array<{ decision: string; rationale: string; owner: string }>;
  actionItems: MomActionItem[];
  risksBlockers: Array<{ risk: string; impact: string; mitigation: string }>;
  parkingLot: string[];
  nextSteps: Array<{ step: string; owner: string; when: string }>;
};
