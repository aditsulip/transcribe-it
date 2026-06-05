import { promises as fs } from "fs";
import path from "path";
import type { TranscriptionJob } from "@/lib/types/session";

const jobsDir = path.join(process.cwd(), "data", "jobs");

async function ensureDir() {
  await fs.mkdir(jobsDir, { recursive: true });
}

function jobPath(id: string) {
  return path.join(jobsDir, `${id}.json`);
}

export async function saveJob(job: TranscriptionJob) {
  await ensureDir();
  await fs.writeFile(jobPath(job.id), JSON.stringify(job, null, 2), "utf-8");
}

export async function loadJob(id: string) {
  try {
    await ensureDir();
    const raw = await fs.readFile(jobPath(id), "utf-8");
    return JSON.parse(raw) as TranscriptionJob;
  } catch {
    return undefined;
  }
}
