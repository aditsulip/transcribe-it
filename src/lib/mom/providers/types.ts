import type { ProfessionalMom, TranscriptResult } from "@/lib/types/transcript";
import type { MomGenerationMode, TranscriptQualityReport } from "@/lib/mom/transcript-quality";

export type MomProvider = {
  generate(input: {
    transcript: TranscriptResult;
    mode: MomGenerationMode;
    quality: TranscriptQualityReport;
  }): Promise<ProfessionalMom>;
};
