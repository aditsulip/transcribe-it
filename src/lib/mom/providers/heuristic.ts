import { generateProfessionalMom } from "@/lib/mom-generator";
import type { MomProvider } from "@/lib/mom/providers/types";

export const heuristicMomProvider: MomProvider = {
  async generate(input) {
    return generateProfessionalMom(input.transcript);
  },
};
