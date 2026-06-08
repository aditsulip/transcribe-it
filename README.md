## Transcribe It (LAN)

Simple web app for:
- uploading meeting audio,
- transcribing with Whisper API on Local Model with CPU/GPU,
- generating a professional MoM on a separate page,
- exporting unified output (MoM + transcript) as `.md` or `.txt`,
- keeping 7-day server-side history cache.

## Requirements
- Node.js 20+
- `ffmpeg` + `ffprobe` available in PATH (needed for long-audio chunking)

## Setup
1. Copy env file:
   - `copy .env.example .env.local`
2. Adjust `WHISPER_API_BASE_URL` if needed.
3. Configure Ollama MoM model:
   - `OLLAMA_BASE_URL`
   - `OLLAMA_MODEL=qwen3:4b`
   - `MOM_PROVIDER=ollama`
   - `OLLAMA_TIMEOUT_MS=120000`
4. Optional retention:
   - `SESSION_RETENTION_DAYS=7`
5. Optional upload tuning:
   - `MAX_UPLOAD_MB=80` (direct upload limit)
   - `NEXT_PUBLIC_MAX_UPLOAD_MB=80` (client threshold to switch into chunked upload)
   - `MAX_CHUNK_UPLOAD_MB=1024` (absolute chunked upload cap)
   - `UPLOAD_CHUNK_SIZE_BYTES=5242880` (5MB chunk size)
6. Install dependencies:
   - `npm install`

## Run
- Start server: `npm run dev`
- Open from your machine: `http://localhost:3000`
- Open from friend on same LAN: `http://<your-local-ip>:3000`

## Architecture (Separation of Concerns)
- UI: `src/app/*`, `src/components/*`
- Domain logic: `src/lib/audio/*`, `src/lib/mom*`
- Infrastructure adapters: `src/lib/whisper-client.ts`
- Session store: `src/lib/store/sessions.ts`

## Notes
- Session data is file-backed cache in `data/sessions` with retention cleanup.
- Files larger than direct upload limit are sent via chunked upload API, then assembled server-side.
- Long audio is processed via async job polling (`/api/transcribe/jobs`) to avoid single-request timeout.
- MoM generation defaults to Ollama (`qwen3:4b`) with heuristic fallback when needed.
