import { spawn } from "child_process";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";

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

export function shouldNormalizeForWhisper(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  return [".mp4", ".mkv", ".m4a", ".aac", ".mov", ".webm"].includes(ext);
}

export async function transcodeToWhisperWav(inputPath: string) {
  const outPath = path.join(os.tmpdir(), `whisper-normalized-${randomUUID()}.wav`);
  await runCmd("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-ar",
    "16000",
    "-ac",
    "1",
    outPath,
  ]);
  return outPath;
}
