import { promises as fs } from "fs";
import { randomUUID } from "crypto";
import path from "path";
import os from "os";
import { spawn } from "child_process";

export type AudioChunk = {
  index: number;
  path: string;
  startSec: number;
  endSec: number;
};

const LONG_AUDIO_THRESHOLD = Number(process.env.LONG_AUDIO_THRESHOLD_SECONDS ?? `${20 * 60}`);
const CHUNK_SECONDS = Number(process.env.CHUNK_SECONDS ?? `${8 * 60}`);
const OVERLAP_SECONDS = Number(process.env.OVERLAP_SECONDS ?? "15");

function runCmd(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args);
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

export async function getDurationSeconds(filePath: string) {
  return new Promise<number>((resolve, reject) => {
    const args = [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ];
    const child = spawn("ffprobe", args);
    let out = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffprobe exited with ${code}`));
      const value = Number.parseFloat(out.trim());
      if (Number.isNaN(value)) return reject(new Error("Invalid audio duration"));
      resolve(value);
    });
  });
}

export function shouldChunk(durationSeconds: number) {
  return durationSeconds > LONG_AUDIO_THRESHOLD;
}

export async function splitAudioIntoChunks(inputPath: string, durationSeconds: number) {
  const tempDir = path.join(os.tmpdir(), `transcribe-${randomUUID()}`);
  await fs.mkdir(tempDir, { recursive: true });
  const chunks: AudioChunk[] = [];

  let cursor = 0;
  let i = 0;
  while (cursor < durationSeconds) {
    const start = Math.max(0, cursor - OVERLAP_SECONDS);
    const end = Math.min(durationSeconds, cursor + CHUNK_SECONDS);
    const outPath = path.join(tempDir, `chunk-${i}.wav`);
    const segDuration = Math.max(1, end - start);

    await runCmd("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-ss",
      `${start}`,
      "-t",
      `${segDuration}`,
      "-ar",
      "16000",
      "-ac",
      "1",
      outPath,
    ]);

    chunks.push({ index: i, path: outPath, startSec: start, endSec: end });
    cursor += CHUNK_SECONDS;
    i += 1;
  }

  return { tempDir, chunks };
}

export async function splitAudioByWindowWithoutDuration(inputPath: string) {
  const tempDir = path.join(os.tmpdir(), `transcribe-${randomUUID()}`);
  await fs.mkdir(tempDir, { recursive: true });
  const pattern = path.join(tempDir, "chunk-%03d.wav");

  await runCmd("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-ar",
    "16000",
    "-ac",
    "1",
    "-f",
    "segment",
    "-segment_time",
    `${CHUNK_SECONDS}`,
    "-reset_timestamps",
    "1",
    pattern,
  ]);

  const files = (await fs.readdir(tempDir))
    .filter((f) => f.endsWith(".wav"))
    .sort();

  const chunks: AudioChunk[] = files.map((file, index) => ({
    index,
    path: path.join(tempDir, file),
    startSec: Math.max(0, index * CHUNK_SECONDS - OVERLAP_SECONDS),
    endSec: (index + 1) * CHUNK_SECONDS,
  }));

  return { tempDir, chunks };
}
