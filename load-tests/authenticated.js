/**
 * k6 load test — authenticated (per-user) path
 *
 * This exercises the dynamic part of the app: the proxy auth check plus the
 * per-user pages (/user, event detail) and a public-read baseline. Public pages
 * are ISR-cached, so this is where 3,000 concurrent users actually cost money.
 *
 * ── How to run ───────────────────────────────────────────────────────────────
 *
 * 1. On STAGING, sign in with a test account in a browser.
 * 2. DevTools → Application → Cookies → copy every `sb-<ref>-auth-token*`
 *    cookie into one header string, e.g.:
 *      "sb-xxxx-auth-token=<value>"
 *      (if the session is large it is chunked: ...-auth-token.0, .1 — include them all,
 *       joined with "; ")
 * 3. Run:
 *      BASE_URL=https://staging.example.com \
 *      EVENT_ID=<event-uuid> \
 *      AUTH_COOKIE="sb-xxxx-auth-token=...; sb-xxxx-auth-token.0=...; sb-xxxx-auth-token.1=..." \
 *      VUS=3000 \
 *      k6 run load-tests/authenticated.js
 *
 * Notes:
 * - Registration/PDF work is queue-backed (Redis worker), so those bursts are
 *   better load-tested separately; this script focuses on the request path.
 * - Point BASE_URL at staging, never production.
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL;
const EVENT_ID = __ENV.EVENT_ID;
const AUTH_COOKIE = __ENV.AUTH_COOKIE || "";
const TARGET_VUS = Number(__ENV.VUS || 3000);

export const options = {
  scenarios: {
    // Signed-in traffic ramping to the target number of concurrent users.
    authenticated: {
      executor: "ramping-vus",
      exec: "browseAuthed",
      stages: [
        { duration: "2m", target: Math.round(TARGET_VUS * 0.2) },
        { duration: "5m", target: TARGET_VUS },
        { duration: "2m", target: 0 },
      ],
    },
    // A public-read baseline (should be served from cache / be very cheap).
    public: {
      executor: "constant-vus",
      exec: "browsePublic",
      vus: Math.max(1, Math.round(TARGET_VUS * 0.1)),
      duration: "9m",
    },
  },
  thresholds: {
    "http_req_duration{scenario:authenticated}": ["p(95)<1200"],
    http_req_duration: ["p(99)<2500"],
    http_req_failed: ["rate<0.02"],
  },
};

const authHeaders = AUTH_COOKIE ? { Cookie: AUTH_COOKIE } : {};
const AUTH_PATHS = ["/user", "/events", "/events", "/"];
const PUBLIC_PATHS = ["/", "/events", "/about", "/contact"];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function browseAuthed() {
  if (!AUTH_COOKIE) return;
  const paths = EVENT_ID ? [...AUTH_PATHS, `/events/${EVENT_ID}`] : AUTH_PATHS;
  const res = http.get(`${BASE}${pick(paths)}`, {
    headers: authHeaders,
    redirects: 0,
  });
  check(res, {
    "authed 200": (r) => r.status === 200,
    "not bounced to login": (r) =>
      !(r.status >= 300 && /\/login/.test(r.headers.Location || "")),
  });
  sleep(1 + Math.random() * 4);
}

export function browsePublic() {
  const res = http.get(`${BASE}${pick(PUBLIC_PATHS)}`, { redirects: 0 });
  check(res, { "public ok": (r) => r.status < 400 });
  sleep(1 + Math.random() * 3);
}
