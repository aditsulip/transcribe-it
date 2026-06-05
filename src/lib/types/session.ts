import type {
  ProfessionalMom,
  TranscriptPostProcessMeta,
  TranscriptResult,
} from "@/lib/types/transcript";

export type SessionData = {
  id: string;
  fileName: string;
  createdAt: string;
  expiresAt: string;
  transcript: TranscriptResult;
  transcriptRaw?: TranscriptResult;
  transcriptCleaned?: TranscriptResult;
  postProcess?: TranscriptPostProcessMeta;
  mom?: ProfessionalMom;
};

export type TranscriptionJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type TranscriptionJobErrorCode =
  | "whisper_timeout"
  | "whisper_request_failed"
  | "chunk_failed"
  | "single_transcribe_failed"
  | "duration_probe_failed"
  | "ffmpeg_not_found"
  | "job_cancelled"
  | "invalid_audio"
  | "file_too_large"
  | "unknown";

export type TranscriptionJob = {
  id: string;
  status: TranscriptionJobStatus;
  progress: number;
  stage:
    | "queued"
    | "uploading"
    | "chunking"
    | "transcribing"
    | "generating_mom"
    | "saving"
    | "ready"
    | "failed"
    | "cancelled";
  mode?: "single" | "chunked";
  sessionId?: string;
  error?: string;
  errorCode?: TranscriptionJobErrorCode;
  cancelRequested?: boolean;
  createdAt: string;
  updatedAt: string;
};
