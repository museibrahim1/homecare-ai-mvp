import http from "k6/http";
import { check, fail, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://host.docker.internal:8000";
const EMAIL = __ENV.EMAIL || "admin@palmtai.com";
const PASSWORD = __ENV.PASSWORD || "admin123";
const REQUEST_TIMEOUT = __ENV.REQUEST_TIMEOUT || "30s";

const loginDuration = new Trend("login_duration_ms");
const createClientDuration = new Trend("create_client_duration_ms");
const createVisitDuration = new Trend("create_visit_duration_ms");
const pipelineStatusDuration = new Trend("pipeline_status_duration_ms");
const pipelineDiarizeDuration = new Trend("pipeline_diarize_duration_ms");
const authFailures = new Rate("auth_failures");
const createClientTimeouts = new Rate("create_client_timeouts");
const createVisitTimeouts = new Rate("create_visit_timeouts");
const createClientFailures = new Rate("create_client_failures");
const createVisitFailures = new Rate("create_visit_failures");

export const options = {
  scenarios:
    (__ENV.TEST_TYPE || "baseline") === "spike"
      ? {
          spike: {
            executor: "ramping-vus",
            startVUs: 5,
            stages: [
              { duration: "30s", target: 5 },
              { duration: "30s", target: Number(__ENV.SPIKE_VUS || 50) },
              { duration: "2m", target: Number(__ENV.SPIKE_VUS || 50) },
              { duration: "30s", target: 5 },
              { duration: "30s", target: 0 },
            ],
            gracefulRampDown: "15s",
          },
        }
      : {
          baseline: {
            executor: "per-vu-iterations",
            vus: Number(__ENV.VUS || 5),
            iterations: Number(__ENV.ITERATIONS || 50),
            maxDuration: "10m",
          },
        },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1500"],
    login_duration_ms: ["p(95)<1000"],
    pipeline_status_duration_ms: ["p(95)<1200"],
    pipeline_diarize_duration_ms: ["p(95)<1500"],
    auth_failures: ["rate<0.02"],
    create_client_failures: ["rate<0.1"],
    create_visit_failures: ["rate<0.1"],
  },
};

function safeJson(res, path) {
  if (!res || !res.body) return null;
  try {
    return path ? res.json(path) : res.json();
  } catch (_) {
    return null;
  }
}

function login() {
  const payload = JSON.stringify({ email: EMAIL, password: PASSWORD });
  const res = http.post(`${BASE_URL}/auth/login`, payload, {
    headers: { "Content-Type": "application/json" },
    tags: { name: "auth_login" },
    timeout: REQUEST_TIMEOUT,
  });
  loginDuration.add(res.timings.duration);

  const ok = check(res, {
    "login status is 200": (r) => r.status === 200,
    "login returns access_token": (r) => Boolean(safeJson(r, "access_token")),
  });
  authFailures.add(!ok);
  if (!ok) {
    fail(`Login failed: status=${res.status} body=${res.body}`);
  }

  return safeJson(res, "access_token");
}

export function setup() {
  return { token: login() };
}

function createClient(headers) {
  const suffix = `${__VU}-${__ITER}-${Date.now()}`;
  const payload = JSON.stringify({
    full_name: `k6 client ${suffix}`,
  });

  const res = http.post(`${BASE_URL}/clients`, payload, {
    headers,
    tags: { name: "clients_create" },
    timeout: REQUEST_TIMEOUT,
  });
  createClientDuration.add(res.timings.duration);
  const timedOut = !res || res.status === 0;
  createClientTimeouts.add(timedOut);

  const ok = check(res, {
    "create client status is 201": (r) => r.status === 201,
    "create client returns id": (r) => Boolean(safeJson(r, "id")),
  });
  createClientFailures.add(!ok);

  return safeJson(res, "id");
}

function createVisit(headers, clientId) {
  const payload = JSON.stringify({ client_id: clientId });
  const res = http.post(`${BASE_URL}/visits`, payload, {
    headers,
    tags: { name: "visits_create" },
    timeout: REQUEST_TIMEOUT,
  });
  createVisitDuration.add(res.timings.duration);
  const timedOut = !res || res.status === 0;
  createVisitTimeouts.add(timedOut);

  const ok = check(res, {
    "create visit status is 201": (r) => r.status === 201,
    "create visit returns id": (r) => Boolean(safeJson(r, "id")),
  });
  createVisitFailures.add(!ok);

  return safeJson(res, "id");
}

export default function (data) {
  const headers = {
    Authorization: `Bearer ${data.token}`,
    "Content-Type": "application/json",
  };
  const clientId = createClient(headers);
  if (!clientId) {
    sleep(0.1);
    return;
  }
  const visitId = createVisit(headers, clientId);
  if (!visitId) {
    sleep(0.1);
    return;
  }

  const statusRes = http.get(`${BASE_URL}/pipeline/visits/${visitId}/status`, {
    headers,
    tags: { name: "pipeline_status" },
    timeout: REQUEST_TIMEOUT,
  });
  pipelineStatusDuration.add(statusRes.timings.duration);
  check(statusRes, {
    "pipeline status is 200": (r) => r.status === 200,
  });

  const diarizeRes = http.post(
    `${BASE_URL}/pipeline/visits/${visitId}/diarize`,
    null,
    { headers, tags: { name: "pipeline_diarize" }, timeout: REQUEST_TIMEOUT }
  );
  pipelineDiarizeDuration.add(diarizeRes.timings.duration);
  check(diarizeRes, {
    "pipeline diarize is 200": (r) => r.status === 200,
  });

  sleep(0.1);
}
