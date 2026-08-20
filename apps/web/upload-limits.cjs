/**
 * Shared upload size limits for the web app.
 *
 * Next.js rewrites (/api → Railway) buffer the request body. The default
 * buffer is 10MB, which truncates real assessment MP3s and returns 500.
 * Keep PROXY_MAX_BODY well above that default, and keep the UI ceiling at
 * or below the proxy limit so users never hit a silent truncate.
 *
 * Do NOT also set experimental.middlewareClientMaxBodySize in next.config.js
 * (Next throws if both proxy + middleware body limits are set).
 */
module.exports = {
  /** Value for experimental.proxyClientMaxBodySize */
  PROXY_MAX_BODY: '200mb',
  /** Floor used by CI. Must stay above Next's 10MB default. */
  PROXY_MIN_BODY_BYTES: 100 * 1024 * 1024,
  /** Client-side audio picker ceiling (must be <= proxy max). */
  AUDIO_UPLOAD_MAX_BYTES: 200 * 1024 * 1024,
  AUDIO_UPLOAD_MAX_LABEL: '200MB',
};
