/**
 * Client-facing upload ceilings. Keep in sync with apps/web/upload-limits.cjs
 * (CI asserts the Next proxy limit stays above the UI ceiling).
 */
export const AUDIO_UPLOAD_MAX_BYTES = 200 * 1024 * 1024;
export const AUDIO_UPLOAD_MAX_LABEL = '200MB';
