import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

type UploadMeta = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  totalChunks: number;
};

const uploadsRoot = path.join(process.cwd(), "data", "uploads");

function getUploadDir(uploadId: string) {
  return path.join(uploadsRoot, uploadId);
}

function getMetaPath(uploadId: string) {
  return path.join(getUploadDir(uploadId), "meta.json");
}

function getChunkPath(uploadId: string, index: number) {
  return path.join(getUploadDir(uploadId), `chunk-${index.toString().padStart(6, "0")}.part`);
}

export async function createUploadSession(input: {
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
}) {
  const id = randomUUID();
  const dir = getUploadDir(id);
  await fs.mkdir(dir, { recursive: true });
  const meta: UploadMeta = {
    id,
    fileName: input.fileName,
    fileSize: input.fileSize,
    mimeType: input.mimeType,
    totalChunks: input.totalChunks,
    createdAt: new Date().toISOString(),
  };
  await fs.writeFile(getMetaPath(id), JSON.stringify(meta, null, 2), "utf-8");
  return meta;
}

export async function getUploadSession(uploadId: string) {
  try {
    const raw = await fs.readFile(getMetaPath(uploadId), "utf-8");
    return JSON.parse(raw) as UploadMeta;
  } catch {
    return undefined;
  }
}

export async function saveUploadChunk(uploadId: string, index: number, bytes: Uint8Array) {
  await fs.writeFile(getChunkPath(uploadId, index), bytes);
}

export async function listUploadedChunkIndexes(uploadId: string) {
  const files = await fs.readdir(getUploadDir(uploadId));
  return files
    .filter((f) => f.startsWith("chunk-") && f.endsWith(".part"))
    .map((f) => Number.parseInt(f.replace("chunk-", "").replace(".part", ""), 10))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
}

export async function assembleUploadToFile(uploadId: string, outputPath: string) {
  const meta = await getUploadSession(uploadId);
  if (!meta) throw new Error("Upload session not found");
  const uploaded = await listUploadedChunkIndexes(uploadId);
  for (let i = 0; i < meta.totalChunks; i += 1) {
    if (!uploaded.includes(i)) throw new Error(`Missing chunk ${i}`);
  }
  const chunks = await Promise.all(
    uploaded.map(async (index) => fs.readFile(getChunkPath(uploadId, index))),
  );
  const merged = Buffer.concat(chunks);
  await fs.writeFile(outputPath, merged);
  return meta;
}

export async function deleteUploadSession(uploadId: string) {
  await fs.rm(getUploadDir(uploadId), { recursive: true, force: true });
}

