export class JobError extends Error {
  code:
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

  constructor(
    code:
      | "whisper_timeout"
      | "whisper_request_failed"
      | "chunk_failed"
      | "single_transcribe_failed"
      | "duration_probe_failed"
      | "ffmpeg_not_found"
      | "job_cancelled"
      | "invalid_audio"
      | "file_too_large"
      | "unknown",
    message: string,
  ) {
    super(message);
    this.code = code;
  }
}
