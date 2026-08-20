#!/usr/bin/env node
/**
 * Regression guard: assessment uploads fail when Next's proxy body limit
 * drops back to the 10MB default. Fails CI if the limit is missing, too
 * small, or conflicting with middlewareClientMaxBodySize.
 */
const path = require('path');
const {
  PROXY_MIN_BODY_BYTES,
  AUDIO_UPLOAD_MAX_BYTES,
} = require('../upload-limits.cjs');

function parseSize(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = String(value).trim().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/i);
  if (!match) {
    throw new Error(`Cannot parse body size: ${JSON.stringify(value)}`);
  }
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const mult = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 }[unit];
  return Math.floor(amount * mult);
}

const config = require(path.join(__dirname, '..', 'next.config.js'));
const experimental = config.experimental || {};
const limit = experimental.proxyClientMaxBodySize;

if (limit == null) {
  console.error(
    'FAIL: experimental.proxyClientMaxBodySize is missing. ' +
      'Without it, Next defaults to 10MB and assessment uploads fail.'
  );
  process.exit(1);
}

if (experimental.middlewareClientMaxBodySize != null) {
  console.error(
    'FAIL: experimental.middlewareClientMaxBodySize is set. ' +
      'Next.js rejects setting it together with proxyClientMaxBodySize ' +
      '(web deploy will crash). Use only proxyClientMaxBodySize.'
  );
  process.exit(1);
}

let bytes;
try {
  bytes = parseSize(limit);
} catch (err) {
  console.error(`FAIL: ${err.message}`);
  process.exit(1);
}

if (bytes < PROXY_MIN_BODY_BYTES) {
  console.error(
    `FAIL: proxyClientMaxBodySize=${JSON.stringify(limit)} (${bytes} bytes) ` +
      `is below the ${PROXY_MIN_BODY_BYTES} byte floor. Assessment MP3s exceed 10MB.`
  );
  process.exit(1);
}

if (AUDIO_UPLOAD_MAX_BYTES > bytes) {
  console.error(
    `FAIL: AUDIO_UPLOAD_MAX_BYTES (${AUDIO_UPLOAD_MAX_BYTES}) exceeds ` +
      `proxyClientMaxBodySize (${bytes}). The UI would accept files the proxy truncates.`
  );
  process.exit(1);
}

const uiLimitsPath = path.join(__dirname, '..', 'src', 'lib', 'uploadLimits.ts');
const uiSource = require('fs').readFileSync(uiLimitsPath, 'utf8');
const uiMatch = uiSource.match(
  /AUDIO_UPLOAD_MAX_BYTES\s*=\s*(\d+)\s*\*\s*1024\s*\*\s*1024/
);
if (!uiMatch) {
  console.error(
    'FAIL: could not parse AUDIO_UPLOAD_MAX_BYTES from src/lib/uploadLimits.ts'
  );
  process.exit(1);
}
const uiBytes = Number(uiMatch[1]) * 1024 * 1024;
if (uiBytes !== AUDIO_UPLOAD_MAX_BYTES) {
  console.error(
    `FAIL: uploadLimits.ts AUDIO_UPLOAD_MAX_BYTES (${uiBytes}) does not match ` +
      `upload-limits.cjs (${AUDIO_UPLOAD_MAX_BYTES}). Keep them equal.`
  );
  process.exit(1);
}

console.log(
  `OK: proxyClientMaxBodySize=${JSON.stringify(limit)} (${bytes} bytes); ` +
    `audio UI max=${AUDIO_UPLOAD_MAX_BYTES} bytes`
);
