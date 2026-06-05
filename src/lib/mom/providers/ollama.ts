import type { MomProvider } from "@/lib/mom/providers/types";
import { buildMomPrompt } from "@/lib/mom/prompt";
import { isProfessionalMom } from "@/lib/mom/schema";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://192.168.0.251:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3:4b";
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? "120000");

export const ollamaMomProvider: MomProvider = {
  async generate(input) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          format: "json",
          stream: false,
          options: { temperature: 0.2 },
          messages: [
            {
              role: "system",
              content: "Anda menghasilkan notulen rapat profesional dalam JSON valid.",
            },
            { role: "user", content: buildMomPrompt(input.transcript, input.mode, input.quality) },
          ],
        }),
      });
      if (!response.ok) throw new Error(`Ollama failed: ${response.status}`);
      const payload = (await response.json()) as { message?: { content?: string } };
      const content = payload?.message?.content ?? "{}";
      const parsed = JSON.parse(content) as unknown;
      if (!isProfessionalMom(parsed)) {
        throw new Error("Ollama JSON schema invalid");
      }
      return parsed;
    } finally {
      clearTimeout(timer);
    }
  },
};
