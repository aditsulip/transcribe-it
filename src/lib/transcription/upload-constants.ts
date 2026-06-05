export const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB ?? "80");
export const CHUNK_SIZE_BYTES = Number(process.env.UPLOAD_CHUNK_SIZE_BYTES ?? `${5 * 1024 * 1024}`);
export const MAX_CHUNK_UPLOAD_MB = Number(process.env.MAX_CHUNK_UPLOAD_MB ?? "1024");
export const ACCEPTED_AUDIO_PREFIX = "audio/";
export const ACCEPTED_VIDEO_MIMES = new Set([
  "video/mp4",
  "video/x-m4v",
  "video/x-matroska",
  "video/mkv",
  "application/x-matroska",
]);
export const ACCEPTED_VIDEO_EXTENSIONS = new Set([".mp4", ".mkv"]);

function getBaseMimeType(mimeType: string) {
  return mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function isAcceptedAudioType(fileName: string, mimeType: string) {
  const lowerName = fileName.toLowerCase();
  const baseMime = getBaseMimeType(mimeType);
  const hasKnownAllowedExtension = [...ACCEPTED_VIDEO_EXTENSIONS].some((ext) =>
    lowerName.endsWith(ext),
  );
  return (
    baseMime.startsWith(ACCEPTED_AUDIO_PREFIX) ||
    ACCEPTED_VIDEO_MIMES.has(baseMime) ||
    hasKnownAllowedExtension
  );
}

export function sanitizeUploadFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

