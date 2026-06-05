import { promises as fs } from "fs";
import path from "path";
import type { ProfessionalMom } from "@/lib/types/transcript";
import type { SessionData } from "@/lib/types/session";

const SESSION_RETENTION_DAYS = Number(process.env.SESSION_RETENTION_DAYS ?? "7");
const storeDir = path.join(process.cwd(), "data", "sessions");

async function ensureStoreDir() {
  await fs.mkdir(storeDir, { recursive: true });
}

function filePathFor(id: string) {
  return path.join(storeDir, `${id}.json`);
}

export async function saveSession(data: Omit<SessionData, "expiresAt">) {
  await ensureStoreDir();
  const expiresAt = new Date(
    Date.now() + SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const payload: SessionData = { ...data, expiresAt };
  await fs.writeFile(filePathFor(payload.id), JSON.stringify(payload, null, 2), "utf-8");
  return payload;
}

export async function getSession(id: string) {
  try {
    const raw = await fs.readFile(filePathFor(id), "utf-8");
    const parsed = JSON.parse(raw) as SessionData;
    if (new Date(parsed.expiresAt).getTime() < Date.now()) {
      await fs.rm(filePathFor(id), { force: true });
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export async function listSessions() {
  await ensureStoreDir();
  const files = await fs.readdir(storeDir);
  const sessions: SessionData[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const session = await getSession(file.replace(".json", ""));
    if (session) sessions.push(session);
  }
  sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return sessions;
}

export async function deleteSession(id: string) {
  await fs.rm(filePathFor(id), { force: true });
}

export async function attachMom(id: string, mom: ProfessionalMom) {
  const found = await getSession(id);
  if (!found) return undefined;
  found.mom = mom;
  await fs.writeFile(filePathFor(found.id), JSON.stringify(found, null, 2), "utf-8");
  return found;
}

export async function cleanupExpiredSessions() {
  await ensureStoreDir();
  const files = await fs.readdir(storeDir);
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const fullPath = path.join(storeDir, file);
    try {
      const raw = await fs.readFile(fullPath, "utf-8");
      const parsed = JSON.parse(raw) as SessionData;
      if (new Date(parsed.expiresAt).getTime() < Date.now()) {
        await fs.rm(fullPath, { force: true });
      }
    } catch {
      await fs.rm(fullPath, { force: true });
    }
  }
}
