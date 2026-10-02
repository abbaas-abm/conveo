# Performance Tuning — Scaling to 10,000 Concurrent Users

**Project:** CSD Events Platform (`conveo`)
**Stack:** Next.js 16.3.7 (App Router, `output: "standalone"`), React 19, Supabase (Pro), Plunk email, pdf-lib + qrcode, Docker on Hostinger KVM 2 (2 vCPU / 8 GB RAM).
**Document scope:** Why the platform is not yet ready for 10k concurrent users, and a step-by-step path to get there without changing the stack.

> **How to read this:** Phases are ordered by impact-per-effort. Do them in order. Each phase has a **Goal**, **Steps**, and **Verification**. Estimated effort assumes one developer familiar with the codebase.

---

## 0. Verdict & Executive Summary

The platform is **not ready** to confidently serve 10,000 concurrent users in its current form.

The good news: the ceiling is **architectural, not hardware**. The VPS and Supabase Pro are adequate *once the request path is fixed*. The two things killing capacity today are:

1. **Nothing is cached, and every page is dynamically server-rendered.** The shared `(site)` layout reads the session (`app/(site)/layout.tsx:6`), which forces every public page into dynamic rendering. Combined with `cookies()` in `lib/supabase/server.ts:10`, every page view — including `/`, `/events`, `/events/[id]` — does a full Node render plus Supabase queries. No CDN can help because the responses are marked `private, no-store`.
2. **CPU-bound PDF/QR generation runs inside the web process.** `after()` in `app/api/registration/route.ts:89`, `app/api/pledges/route.ts:62`, `app/api/reports/route.ts:53` only defers the work on the same event loop. A registration surge will peg the 2 vCPUs and block SSR.

With **Cloudflare in front + static/ISR public pages + a Redis-backed job queue for PDFs + a second Node worker process**, 10k concurrent users is realistic on the current KVM 2. Everything below is either free or already paid for.

### Capacity model (read this before panicking)

"10,000 concurrent users" almost never means 10,000 in-flight requests. It means ~10,000 active sessions. Realistic event-day load:

| Metric | Realistic peak | Comments |
| --- | --- | --- |
| Concurrent sessions | 10,000 | Browsers connected / idle / polling |
| Requests per second (RPS) | 100–500 | Bursty around start times and registration open |
| Registration burst | 1,000–3,000 in 10 min | Worst-case PDF generation spike |
| Page views per second | 50–300 | Mostly read-heavy, cacheable |

A single `node server.js` process on 2 shared vCPUs can do roughly **100–400 RPS** of dynamic SSR before latency explodes. That is why caching and offloading matter more than raw CPU.

---

## 1. Current Architecture

```
Browser ──► :3000 ──► Next.js standalone (1 process, port 3000)
                         │  proxy.ts runs auth.getUser() on every route
                         │  cookies() forces dynamic render on every page
                         ├──► Supabase PostgREST (events, registrations, …)
                         ├──► Supabase Auth (getUser round trip)
                         ├──► Supabase Storage (PDF upload)
                         └── after() ──► pdf-lib + qrcode (CPU) ──► Plunk API
```

No CDN, no reverse proxy, no TLS terminator, no clustering, no cache, no queue, no rate limiting.

---

## 2. Problem Register

| ID | Problem | Where | Impact | Severity |
| --- | --- | --- | --- | --- |
| P-01 | Every public page is dynamic SSR | `app/(site)/layout.tsx:6`, `lib/supabase/server.ts:10` | No CDN/edge caching possible; Node + Supabase hit on every view | **Critical** |
| P-02 | No caching of data or HTML anywhere | `lib/data.ts` (all functions) | Supabase query volume scales 1:1 with traffic | **Critical** |
| P-03 | PDF + QR generation on the web event loop | `app/api/*/route.ts`, `lib/pdf/*`, `lib/email/registration.ts:91` | Registration/pledge/report bursts block SSR and spike RAM | **Critical** |
| P-04 | Single Node process, single container | `Dockerfile`, `docker-compose.yml` | Second vCPU idle; no failover; one crash = outage | **High** |
| P-05 | Auth check runs on every route before cache | `proxy.ts:9`, `lib/supabase/proxy.ts:34,69` | Extra Supabase round trip per authenticated request; blocks CDN caching | **High** |
| P-06 | Image optimizer open to any remote host (`**`) | `next.config.ts` remotePatterns | SSRF + CPU DoS via arbitrary image proxying | **High** |
| P-07 | No rate limiting on APIs/auth | all API routes, `/login`, `/register` | Trivial abuse; brute force; cost blowups | **High** |
| P-08 | No TLS / reverse proxy; port 3000 exposed | `docker-compose.yml` | No HTTP/2, no compression, insecure, no load balancing | **Medium** |
| P-09 | Missing database indexes on hot columns | `supabase/fixes/*.sql` | Slow queries as tables grow into 10k+ rows | **Medium** |
| P-10 | Realtime connection cap (~500 on Pro) | `components/reflections/ReflectionsBoard.tsx:62` | Reflections wall cannot hold 10k open sockets | **Medium** |
| P-11 | No observability | — | Cannot find the bottleneck under load | **Medium** |
| P-12 | No load testing | — | "Ready for 10k" is a guess | **Medium** |

---

## 3. Target Architecture (After All Phases)

```
                       ┌─────────────────────────────┐
   Browser ──► Cloudflare (TLS, WAF, rate limit, edge cache)
                       └──────────────┬──────────────┘
                                      │ cache miss / auth routes
                                      ▼
                              Caddy (reverse proxy, HTTP/2)
                                      │
                      ┌───────────────┴───────────────┐
                      ▼                               ▼
            Next.js replica #1                Next.js replica #2
                      │                               │
                      └───────────┬───────────────────┘
                                  │ enqueue (no PDF on web)
                                  ▼
                             Redis (BullMQ queues)
                                  │
                                  ▼
                         Worker container (pdf-lib, Plunk, Storage)
                                  │
                                  ▼
                     Supabase (PostgREST, Auth, Storage)
```

---

## Phase 0 — Accounts, DNS & Baseline (½ day)

**Goal:** Stand up the infrastructure pieces the later phases depend on, and confirm existing limits.

### Step 0.1 — Verify your actual Supabase limits
Log in to Supabase → **Project Settings → Infrastructure** and record:

- Compute tier (Micro/Small/Medium). Pro default is often **Micro (1 GB RAM)**; if so, **upgrade to Small or Medium** before event day. This is the single best DB change you can buy.
- **Realtime** concurrent connection limit (Free 200 / Pro ~500 / Team ~1000 — verify).
- **Storage** and **egress** allotments (PDF uploads/downloads count).
- Whether **read replicas** are available on your plan.

Write these numbers into a table at the bottom of this file so you remember them on launch day.

### Step 0.2 — Create a Cloudflare account
1. Sign up at `dash.cloudflare.com`.
2. **Add a site** → enter `witscsd.co.za`.
3. Choose the **Free** plan (it covers everything in Phase 1; upgrade to Pro only if you want advanced WAF).
4. Cloudflare will give you two nameservers. Log in to your domain registrar and **replace the existing nameservers** with Cloudflare's.
5. Wait for propagation (minutes to a few hours). The dashboard will show **Active**.
6. Do **not** enable "Flexible" SSL. After the tunnel/proxy is ready, set **SSL/TLS → Overview → Full (strict)**.

### Step 0.3 — Pick your backend domain
Use a dedicated hostname for the app origin, e.g. `events.witscsd.co.za`. Email continues to use `witscsd.co.za` and is unaffected.

### Step 0.4 — Create the service-role key
In Supabase → **Project Settings → API**, copy the **`service_role`** key. This is used **only** by the worker (Phase 3). Never put it in `NEXT_PUBLIC_*`. Add to `.env`:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # server/worker only
SUPABASE_URL=https://glxcwndygdowqmptrxbq.supabase.co
REDIS_URL=redis://redis:6379
```

Add the same names to `.env.example` with placeholder values.

### Step 0.5 — Create a staging environment
You cannot safely load-test production. Spin up either a second Compose project on the same VPS (`docker compose -p staging`) or a second Supabase project. Load tests will point here first.

**Verification:** Cloudflare shows the site as **Active**; `SUPABASE_SERVICE_ROLE_KEY` and `REDIS_URL` exist in `.env`; you have written down your Supabase compute tier, Realtime cap, and storage/egress limits.

---

## Phase 1 — Cloudflare CDN, TLS, WAF & Rate Limiting (1 day)

**Goal:** Absorb the majority of read traffic and block abuse before it reaches the VPS.

> Prerequisite: Phase 2 makes public pages cacheable. Until then Cloudflare can still cache static assets and images. Do Phase 1 now; it starts paying off immediately and is required for Phase 2 to matter.

### Step 1.1 — Point the app hostname at the VPS, proxied
1. In Cloudflare → **DNS → Records**, create an **A** record:
   - Name: `events`
   - IPv4: your VPS public IP
   - **Proxy status: Proxied (orange cloud)** ← essential
2. Keep the previous direct DNS record only as a temporary fallback; delete it once verified.

### Step 1.2 — TLS and transport
- **SSL/TLS → Overview:** Full (strict). (You must give the origin a valid cert — Caddy in Phase 4 does this automatically, or use a Cloudflare Origin Certificate.)
- **Speed → Optimization:** enable Brotli, Early Hints, HTTP/3 (with QUIC), 0-RTT.
- **Caching → Configuration:** Browser Cache TTL: "Respect Existing Headers".

### Step 1.3 — Cache Rules
Create rules under **Rules → Cache Rules** (order matters; first match wins):

**Rule A — Cache static assets (already long-lived):** No rule needed; `/_next/static/*` already returns `public, max-age=31536000, immutable`. Confirm under Caching → "Cache eligible".

**Rule B — Cache public HTML (after Phase 2):**
```
When:  hostname eq "events.witscsd.co.za"
       AND (starts_with(http.request.uri.path, "/events")
            OR http.request.uri.path eq "/"
            OR http.request.uri.path eq "/about"
            OR http.request.uri.path eq "/contact"
            OR starts_with(http.request.uri.path, "/reflections"))
Then:  Cache eligibility = Eligible
       Edge TTL = Use cache-control header if present, fallback 60s
       Browser TTL = Respect origin
```
Cloudflare respects Next's `s-maxage`/`stale-while-revalidate` headers on ISR pages, so this rule works automatically once Phase 2 lands.

**Rule C — Bypass cache for everything authenticated:**
```
When:  starts_with(http.request.uri.path, "/api")
       OR starts_with(http.request.uri.path, "/admin")
       OR starts_with(http.request.uri.path, "/user")
       OR starts_with(http.request.uri.path, "/onboarding")
       OR http.request.uri.path eq "/login"
       OR http.request.uri.path eq "/register"
       OR http.request.uri.path eq "/volunteer"
Then:  Cache eligibility = Bypass cache
```
This is mandatory: `proxy.ts` decisions (auth redirects) must run before any cache, so auth-dependent routes must never be cached at the edge.

### Step 1.4 — WAF & rate limiting (Free plan)
Under **Security → WAF → Rate limiting rules**, add:

| Name | Match | Limit |
| --- | --- | --- |
| API burst | `starts_with(uri.path, "/api/")` | 30 requests / minute / IP |
| Auth brute force | `uri.path in {"/login","/register"}` | 10 requests / minute / IP |
| Image optimizer | `starts_with(uri.path, "/_next/image")` | 120 requests / minute / IP |

Enable **Bot Fight Mode** (Security → Bots). Optionally enable "Managed Challenge" for suspicious traffic.

### Step 1.5 — (Recommended) Cloudflare Tunnel — stop exposing port 3000
Instead of publishing `3000:3000`, run `cloudflared` as a container and route `events.witscsd.co.za` → `http://caddy:80` (Phase 4) or `http://web:3000`. This removes the origin IP from the public internet entirely.

```yaml
# docker-compose.yml (added later in Phase 4; shown here for reference)
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
    restart: unless-stopped
```

**Verification:** `curl -I https://events.witscsd.co.za` shows `cf-cache-status: HIT` for a static asset and `server: cloudflare`. Hitting `/api/...` more than 30×/min returns HTTP 429.

---

## Phase 2 — Make Public Pages Cacheable (2–3 days)

**Goal:** Remove `cookies()` from public read paths and cache data + HTML so Cloudflare can serve them.

This is the highest-impact code change. It has two tiers; do Tier A first, then Tier B.

### Tier A — Cache the data layer with `unstable_cache`

Next 16.3.7 in this project runs the **previous caching model** (the `cacheComponents` flag is not enabled in `next.config.ts`). The correct API here is `unstable_cache` and route segment `revalidate` — not the `"use cache"` directive. (See `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md`.)

**Step 2.1 — Create a cookie-less anonymous client.**
`lib/supabase/anon.ts`:

```ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

let cached: ReturnType<typeof createSupabaseClient> | null = null;

export function createAnonClient() {
  const { url, key } = getSupabaseEnv();
  if (!url || !key) return null;
  if (!cached) {
    cached = createSupabaseClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
```

This client never touches `cookies()`, so functions using it can be statically rendered/cached. RLS still applies with the anon role — confirm the relevant tables have public `select` policies (they already work today, so they do).

**Step 2.2 — Cache the public read functions in `lib/data.ts`.**
Wrap only the publicly-readable functions. Example:

```ts
import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";

export const getEvents = unstable_cache(
  async () => {
    const supabase = createAnonClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("events").select("*").order("start_date", { ascending: true });
    return (data ?? []) as EventRecord[];
  },
  ["events"],
  { revalidate: 60, tags: ["events"] },
);
```

Do the same for: `getFeaturedEvent` (60s), `getEventById` (60s), `getEventProgram` (60s), `getSpeakersByEvent` (60s), `getEventAnnouncements` (30s), `getRecentAnnouncements` (30s), `getReflections` (10s — the Realtime subscription keeps the board live, so a short SSR cache is fine), `getEventGallery` (300s).

**Do NOT cache** the user-scoped functions: `getUserRegistrations`, `getUserFeedback`, `getProfileById`, `getAllProfiles`, `getPledgesForEvent`, `getSpeakers`, `getEventAnnouncements` for admin. Leave those on the cookie client.

**Step 2.3 — Add on-demand invalidation.**
When an admin edits an event, its program, speakers, announcements, or visibility flags, call `revalidateTag("events")` (and a `"reflections"` tag for reflections). Add this to the admin mutation handlers in `components/admin/EventEditor.tsx` and the announcement/speaker components. Without this, edge caches will serve stale data until the TTL expires.

**Step 2.4 — Add route segment config to static public pages.**
For pages with no per-user content:
```ts
export const revalidate = 60;
```
Candidates: `/`, `/about`, `/contact`, `/events`. Confirm they don't import `getCurrentUser` after Tier B.

**Tier A result:** Supabase query volume drops dramatically because repeated renders read from Next's cache. Pages that remain dynamic still SSR, but without Supabase round trips. This already removes the biggest DB cost.

### Tier B — Remove `cookies()` from the public layout (unlocks edge HTML caching)

**The blocker:** `app/(site)/layout.tsx:6` calls `getCurrentUser()`, which reads cookies via `lib/auth.ts`. Because a layout uses a Request-time API, **every** page under `(site)` is dynamic and returns `private, no-store`, so Cloudflare can never cache the HTML. This is P-01.

**Step 2.5 — Move the session-aware navbar to the client.**
The navbar only needs to know (a) is there a session, (b) the user's role/profile, to show Login vs Dashboard. Fetch this in a client component using the browser Supabase client (`lib/supabase/client.ts`) and render a stable server-rendered placeholder before hydration.

- Convert the server portion of the navbar in `app/(site)/layout.tsx` to a server component that renders a **static shell**, plus a small client component (e.g. `<NavAuth />`) that resolves the session on mount with `supabase.auth.getSession()` and optionally fetches the profile.
- Remove the `getCurrentUser()` call from the layout.

**Step 2.6 — Split auth-gated sections on the event page.**
`app/(site)/events/[id]/page.tsx:44` calls `getCurrentUser()` to decide the registration state (`myStatus`) and render user-specific UI. To make the page static:

- Render the event content (title, theme, about, programme, speakers, announcements) as a **static/ISR** page.
- Move the **registration state + `RegisterButton`** into a client component that reads the session and the user's registration row on mount, and renders the correct button state.
- The **programme preview gating** (`EventProgramme.tsx`) should also check the session client-side.

This is the largest single refactor in this document. If time is short, Tier A alone removes most Supabase load; Tier B is what unlocks Cloudflare HTML caching and true 10k headroom.

**Step 2.7 — Repeat for `/reflections` and `/pledges/[eventId]`.**
`app/reflections/page.tsx:17` and `app/pledges/[eventId]/page.tsx:15` call `getCurrentUser()`. Split the current-user portion into client components so the routes can be cached. The Realtime board already runs client-side.

**Verification:**
- `curl -I https://events.witscsd.co.za/events` returns `cache-control: s-maxage=60, stale-while-revalidate=...` and `cf-cache-status: HIT` on the second request.
- Authenticated routes (`/admin`, `/user`) still return `private, no-store` and redirect correctly.

---

## Phase 3 — Offload PDFs & Email to a Redis Job Queue (2–3 days)

**Goal:** The web process must never run `pdf-lib`/`qrcode` or hold long `after()` tasks. Move all CPU-bound and external-call work to a separate worker container backed by self-hosted Redis.

### Why a queue (and not just `after()`)
`after()` defers work but keeps it **in the same Node event loop**. Every attendee badge (`lib/pdf/attendee-badge.ts`) and event report (`lib/pdf/event-report.ts`) blocks that loop while pdf-lib lays out pages and the QR code is generated. With a queue, the web process only writes a job (sub-millisecond Redis call) and returns; the worker absorbs bursts at a controlled rate.

**Technology:** **BullMQ** on **self-hosted Redis 7** (you already run Docker; Redis is ~10 MB idle). BullMQ gives retries, backoff, concurrency limits, and prioritization with minimal code.

### Step 3.1 — Run Redis
Add to `docker-compose.yml`:

```yaml
  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --appendonly yes
      --maxmemory 512mb
      --maxmemory-policy noeviction
    volumes:
      - redis-data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  redis-data:
```

Notes:
- `appendonly yes` persists jobs across restarts so a reboot doesn't drop confirmation emails.
- `noeviction` prevents Redis from silently discarding jobs under memory pressure. Keep payloads small (IDs only) so 512 MB is plenty.
- Redis is **not** exposed on a public port — only the app and worker networks reach it.

### Step 3.2 — Add dependencies
```bash
npm install bullmq ioredis
npm install -D tsx
npx next typegen
```

### Step 3.3 — Define queues and a safe enqueue helper
`lib/queue/index.ts`:

```ts
import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : null;

export const queues = connection
  ? {
      registrations: new Queue("registrations", { connection }),
      pledges: new Queue("pledges", { connection }),
      reports: new Queue("reports", { connection }),
    }
  : null;

export async function enqueue(queue: keyof NonNullable<typeof queues>, name: string, data: object) {
  if (!queues) return false;
  await queues[queue].add(name, data, {
    attempts: 5,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: 1_000,
    removeOnFail: 5_000,
  });
  return true;
}
```

The singleton `IORedis` connection is created once per process, not per request. `maxRetriesPerRequest: null` is required by BullMQ.

### Step 3.4 — Create a service-role Supabase client for the worker
`lib/supabase/admin.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

This bypasses RLS, so it lives only in the worker and is never imported by a route or client component.

### Step 3.5 — Refactor the API routes to enqueue (keep `after()` as fallback)
`app/api/registration/route.ts` — replace the `after(...)` block:

```ts
const queued = await enqueue("registrations", "send-confirmation", {
  registrationId,
  data: {
    attendeeId: user.id,
    eventId,
    email: profile.email,
    firstName: profile.first_name ?? "",
    lastName: profile.last_name ?? "",
    personNumber: profile.person_number ?? null,
    position,
    eventTitle: event.title,
    startDate: event.start_date,
    endDate: event.end_date,
    venue: event.venue ?? null,
  },
});
if (!queued) {
  after(() => deliverRegistrationEmail({ supabase, registrationId, data: { /* …same… */ } }));
}
```

Apply the same pattern in `app/api/pledges/route.ts` (enqueue `{ pledgeId }`) and `app/api/reports/route.ts` (enqueue `{ eventId, to: email }`). Keep the inline path so local dev works without Redis.

### Step 3.6 — Write the worker
`worker/index.ts`:

```ts
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { createAdminClient } from "@/lib/supabase/admin";
import { deliverRegistrationEmail } from "@/lib/email/registration";
import { deliverPledgeDocument } from "@/lib/email/pledge";
import { deliverEventReport } from "@/lib/email/report";

const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

new Worker(
  "registrations",
  async (job) => {
    const supabase = createAdminClient();
    await deliverRegistrationEmail({ supabase, registrationId: job.data.registrationId, data: job.data.data });
  },
  { connection, concurrency: 4 },
);

new Worker(
  "pledges",
  async (job) => {
    const supabase = createAdminClient();
    await deliverPledgeDocument({ supabase, pledgeId: job.data.pledgeId });
  },
  { connection, concurrency: 4 },
);

new Worker(
  "reports",
  async (job) => {
    const supabase = createAdminClient();
    await deliverEventReport({ supabase, to: job.data.to, eventId: job.data.eventId });
  },
  { connection, concurrency: 2 },
);

console.log("worker started");
```

`concurrency` is the number of PDFs generated in parallel per worker. Keep it low (2–4) so you don't exhaust RAM; PDFs are memory-heavy. Scale by running more **worker containers**, not higher concurrency.

> **Important:** `lib/email/registration.ts` uses `crypto.randomUUID()` for the storage path (line 134) — available in Node 22, fine. Verify the email functions don't rely on request cookies; they already accept a `supabase` param, so passing the admin client is a drop-in change.

### Step 3.7 — Run the worker in Docker
Add a `worker` service that reuses the project source. The simplest reliable approach is to run the builder stage (which has node_modules + full source) with `tsx`:

```yaml
  worker:
    build:
      context: .
      target: builder
    command: ["npx", "tsx", "worker/index.ts"]
    env_file: [.env]
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: "1.00"
          memory: 1024M
```

Later you can slim this by adding a dedicated `worker` build stage, but the builder target is correct and fast to iterate.

### Step 3.8 — Capacity guidance for the queue
- 1 worker container at concurrency 4 on ~1 vCPU handles roughly 3–8 PDFs/second.
- A 3,000-registration burst therefore clears in ~6–15 minutes — well within acceptable confirmation-email latency. The web server stays responsive the entire time.
- If bursts are larger, run `docker compose up -d --scale worker=2`.

**Verification:**
- Register on staging; the HTTP response returns immediately (`ok: true`) with no `pdf-lib` in the web process.
- `docker compose logs worker` shows the email job completing.
- Stop Redis; registration still returns ok and email falls back to `after()`.
- Restart Redis; queued jobs resume (AOF persistence).

---

## Phase 4 — Scale Node & Add a Reverse Proxy (1 day)

**Goal:** Use both vCPUs, remove the single point of failure, and terminate TLS/compression at the edge.

### Step 4.1 — Run two web replicas behind Caddy
Edit `docker-compose.yml`:
- Remove `container_name: conveo-web` and the `ports: ["3000:3000"]` mapping from `web` (two replicas can't bind the same host port).
- Add resource limits.
- Add `caddy` and a shared Next cache volume.

```yaml
services:
  web:
    build:
      context: .
      args:
        NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}
    image: conveo-web:latest
    env_file: [.env]
    environment:
      - REDIS_URL=redis://redis:6379
    volumes:
      - next-cache:/app/.next/cache
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "0.90"
          memory: 1280M
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 20s
      timeout: 5s
      retries: 3

  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    depends_on: [web]
    restart: unless-stopped

volumes:
  redis-data:
  next-cache:
  caddy-data:
  caddy-config:
```

`Caddyfile`:

```
{
  email admin@witscsd.co.za
}

events.witscsd.co.za {
  encode zstd gzip
  reverse_proxy web:3000
}
```

Scale with:
```bash
docker compose up -d --build --scale web=2 --scale worker=1
```

> **Note on replicas + ISR:** Next's on-disk cache lives in `/app/.next/cache`. Sharing the `next-cache` volume keeps both replicas consistent. In practice Cloudflare serves most HTML, so divergence is minor. If you later want perfect ISR across replicas, configure a shared cache handler — but that's not needed at this scale.

### Step 4.2 — Why 2× 0.90 CPU (not 2× 1.0)
Node is single-threaded; two processes each get a core. `0.90` caps leave room for Redis, Caddy, the worker, and the OS on a 2-vCPU box. If you outgrow this, **upgrade to KVM 4 (4 vCPU / 16 GB)** and raise limits — that's the cheapest real headroom and avoids all of the above complexity beyond config.

### Step 4.3 — Add a health endpoint
`app/api/health/route.ts`:

```ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET() {
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
```

Keep it trivial (no DB call) so it reflects process liveness, not Supabase health.

### Step 4.4 — Reduce per-request auth overhead (P-05)
`proxy.ts` runs `auth.getUser()` on **every** matched route, including static public pages. Two improvements:
- **Narrow the matcher** to only routes that need auth decisions (`/admin`, `/user`, `/volunteer`, `/onboarding`, `/login`, `/register`) instead of everything. Public pages lose nothing and skip the auth round trip. This also lets Cloudflare cache them (Phase 1).
- For authenticated requests, `lib/supabase/proxy.ts:69` does a `profiles` lookup on every navigation. Cache this per-user for a short TTL (e.g. `unstable_cache` keyed by user id, 30s) or move the role/onboarding gate into server components/layouts so it runs once per render, not in the middleware.

```ts
// proxy.ts
export const config = {
  matcher: [
    "/admin/:path*",
    "/user/:path*",
    "/volunteer/:path*",
    "/onboarding",
    "/login",
    "/register",
  ],
};
```

**Verification:** `docker compose ps` shows 2 `web` replicas healthy behind `caddy`; `curl -I https://events.witscsd.co.za` shows `alt-svc: h3` and `content-encoding: br` (on text). Killing one replica keeps the site up.

---

## Phase 5 — Supabase Hardening (1 day)

**Goal:** Ensure the database can serve the remaining (uncached) queries quickly and that realtime limits are respected.

### Step 5.1 — Add missing indexes
Create `supabase/fixes/performance_indexes.sql`:

```sql
create index if not exists idx_registrations_event_id
  on public.registrations(event_id);
create index if not exists idx_registrations_attendee_id
  on public.registrations(attendee_id);
create unique index if not exists ux_registrations_attendee_event
  on public.registrations(attendee_id, event_id);
create index if not exists idx_events_start_date
  on public.events(start_date);
create index if not exists idx_events_status
  on public.events(status);
create index if not exists idx_reflections_event_created
  on public.reflections(event_id, created_at desc);
create index if not exists idx_reflections_created
  on public.reflections(created_at desc);
create index if not exists idx_pledges_event_created
  on public.pledges(event_id, created_at desc);
create index if not exists idx_announcements_created
  on public.announcements(created_at desc);
create index if not exists idx_attendance_event
  on public.attendance(event_id);
create index if not exists idx_profiles_role
  on public.profiles(role);
```

Run it in the Supabase SQL editor. The unique index also guarantees the `onConflict: "attendee_id,event_id"` upsert in `app/api/registration/route.ts:58` stays efficient.

### Step 5.2 — Trim over-fetching
Several helpers use `select("*")` (`lib/data.ts`). For hot public queries (events, announcements, reflections), select only the columns the UI uses. This reduces PostgREST serialization and egress. Not urgent, but cheap.

### Step 5.3 — Compute tier
If Step 0.1 showed **Micro**, upgrade to **Small/Medium** for the event. This directly increases PostgREST throughput and connection headroom.

### Step 5.4 — Realtime limits (P-10)
Supabase Pro caps Realtime at roughly **500 concurrent connections** (verify). The reflections wall opens one websocket per viewer. If the wall is projected on a screen plus a few hundred phones, you're fine; if 10k people open it simultaneously, you're not.

Mitigations:
- Move the wall to a short-poll model: server route cached for 10s (`getReflections` already planned for 10s in Tier A) + client refetches every 10–15s. This trades a little freshness for unlimited scale and zero websocket cost.
- Or keep Realtime but **debounce**: only subscribe while the tab is visible (`document.visibilityState`), and disconnect when hidden. Most of 10k "concurrent" users are idle background tabs.
- Do **not** subscribe to `postgres_changes` on a table that receives high write volume without a filter; scope the channel by `event_id` (already done at `ReflectionsBoard.tsx:62`).

### Step 5.5 — Storage & egress
Each registration writes a PDF to `event_images/attendee-tags/...` and the email carries a base64 copy. That's double the bytes. If egress becomes a concern, keep the Storage copy and link it from the email instead of attaching, or reduce PDF size (minimal fonts, no large images).

**Verification:** `EXPLAIN ANALYZE` on the hot queries shows index scans, not sequential scans, at 10k+ rows. Supabase dashboard shows no connection saturation during a load test.

---

## Phase 6 — Security Hardening (½ day)

**Goal:** Close the DoS/abuse gaps that would let a handful of clients take the site down.

### Step 6.1 — Fix the image optimizer allowlist (P-06)
`next.config.ts` currently allows `hostname: "**"`, meaning anyone can make your server fetch and re-encode arbitrary remote images — an SSRF and CPU-exhaustion vector. Replace with an explicit list:

```ts
images: {
  remotePatterns: [
    { protocol: "https", hostname: "glxcwndygdowqmptrxbq.supabase.co" },
    { protocol: "https", hostname: "witscsd.co.za" },
    { protocol: "https", hostname: "www.witscsd.co.za" },
  ],
},
```

If you serve all media from Supabase Storage, list only the Supabase host. Cloudflare rate-limits `/_next/image` (Phase 1.4) as a second layer.

### Step 6.2 — Rate limiting (defence in depth)
Cloudflare handles edge rate limiting. Add a lightweight in-app guard for the mutating routes (registration, pledges, reports) keyed by user id, using Redis (already running):

```ts
// lib/queue/ratelimit.ts — simple fixed-window counter
import IORedis from "ioredis";
const redis = process.env.REDIS_URL ? new IORedis(process.env.REDIS_URL) : null;

export async function allow(key: string, limit: number, windowSec: number) {
  if (!redis) return true;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSec);
  return count <= limit;
}
```

Call it at the top of each API route, e.g. `if (!(await allow(`reg:${user.id}`, 10, 60))) return NextResponse.json({error:"Too many requests"},{status:429})`.

### Step 6.3 — Confirm secret hygiene
- `SUPABASE_SERVICE_ROLE_KEY` only in `.env` (server/worker). Never `NEXT_PUBLIC_`.
- `.env` is in `.gitignore` (verify). `.env.example` contains placeholders only.
- Plunk key stays server-only.

### Step 6.4 — RLS review
Confirm every table has RLS enabled and that public reads are intentionally public (`events`, `speakers`, `reflections`, `announcements` where appropriate). The anon client in Phase 2 depends on this.

**Verification:** `/_next/image?url=https://evil.example.com/x.png` returns a 400; the API routes return 429 when spammed.

---

## Phase 7 — Observability (½ day)

**Goal:** See the bottleneck before users feel it.

### Step 7.1 — Application errors & traces
Add Sentry (`@sentry/nextjs`) for server + client error tracking and performance traces. Configure a sample rate (e.g. `tracesSampleRate: 0.1`) to avoid overhead.

### Step 7.2 — Metrics to watch on event day
- Cloudflare: Requests, Cache hit ratio (target >80% for HTML), Origin requests, 4xx/5xx, WAF blocks.
- VPS: CPU (per core), RAM, disk I/O, container restarts.
- Redis: queue depth per queue (`LLEN bull:registrations:wait`), failed jobs.
- Supabase: DB CPU, active connections, Realtime connections, slow queries.
- App: p95/p99 response time, error rate.

### Step 7.3 — Dashboards & alerts
- Alert if Cloudflare origin 5xx > 1% for 2 min.
- Alert if Redis `bull:registrations:failed` > 50.
- Alert if VPS CPU > 85% for 5 min or RAM > 90%.

---

## Phase 8 — Load Testing & Go-Live (1–2 days)

**Goal:** Prove the numbers before the real event, on staging.

### Step 8.1 — Write a k6 script
`load-tests/smoke.js`:

```js
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      stages: [
        { duration: "2m", target: 500 },
        { duration: "5m", target: 2000 },
        { duration: "2m", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE = __ENV.BASE_URL;

export default function () {
  const paths = ["/", "/events", "/about", "/events"];
  const res = http.get(`${BASE}${paths[Math.floor(Math.random() * paths.length)]}`);
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(Math.random() * 3);
}
```

### Step 8.2 — Test the registration burst separately
With authenticated sessions, hit `POST /api/registration` for a test event at high concurrency and watch:
- API response time stays flat (queue absorbs it).
- Worker queue depth peaks then drains.
- Web CPU never saturates.

### Step 8.3 — Interpretation
- If p95 is high but Cloudflare hit ratio is low → Phase 2 caching didn't land on those routes.
- If VPS CPU is pegged and origin requests are high → caching missing or bypass rule too broad.
- If Redis queue never drains → add a second worker.
- If 5xx come from Supabase → compute tier / indexes.

### Step 8.4 — Go-live checklist
- [ ] Cloudflare Active, SSL Full (strict), Brotli/HTTP3 on.
- [ ] Cache Rules + auth bypass verified (`cf-cache-status`).
- [ ] Public pages return `s-maxage`; authenticated pages `no-store`.
- [ ] `revalidateTag` wired to admin mutations.
- [ ] Redis + worker healthy; AOF persistence on.
- [ ] 2 web replicas healthy behind Caddy; healthchecks green.
- [ ] Supabase compute tier confirmed; indexes applied.
- [ ] Image optimizer allowlist restricted.
- [ ] Edge rate limits + Bot Fight Mode on.
- [ ] Sentry + dashboards live; alerts configured.
- [ ] k6 targets met on staging.
- [ ] Rollback plan: keep the previous image tag; `docker compose down` the new services if needed.

---

## 4. Rollout Schedule (suggested)

| Day | Work | Milestone |
| --- | --- | --- |
| 1 | Phase 0 + 1 | Cloudflare live, limits documented |
| 2–4 | Phase 2 Tier A | Data cached, Supabase load down |
| 5–6 | Phase 3 | Queue + worker live, web CPU freed |
| 7 | Phase 4 | Replicas + Caddy + narrowed proxy |
| 8 | Phase 5 + 6 | Indexes, compute, security |
| 9 | Phase 7 + 8 | Observability + load test |
| 10 | Buffer | Fix findings, buffer for event |

Phase 2 Tier B (removing `cookies()` from the public layout) can run in parallel with Phases 3–4 if you have a second developer, since it's the longest refactor.

---

## 5. Quick Wins vs. Deep Refactors

**Cheap, high impact (do first):** Cloudflare proxy + cache rules, Phase 2 Tier A (`unstable_cache`), Redis worker, narrowed proxy matcher, image allowlist, indexes, 2 replicas.

**Expensive but unlocks 10k:** Phase 2 Tier B (de-cookie the `(site)` layout and event page).

**Buy-your-way-out:** Upgrade Supabase compute (Small/Medium) and VPS to KVM 4. Combined with the above, this removes almost all risk. Neither replaces Phase 2/3 — throwing CPU at a full-page-SSR + in-process-PDF design just delays the ceiling.

---

## 6. Recorded Limits (fill in from Step 0.1)

| Resource | Plan | Limit | Date checked |
| --- | --- | --- | --- |
| Supabase compute | Pro | ______ | |
| Supabase Realtime conns | Pro | ______ | |
| Supabase storage | Pro | ______ | |
| Supabase egress | Pro | ______ | |
| VPS | KVM 2 | 2 vCPU / 8 GB / 100 GB | |
| Cloudflare | Free | — | |

---

## 7. Appendix — Files Touched / Created by This Plan

**New:**
- `lib/supabase/anon.ts` — cookie-less public client
- `lib/supabase/admin.ts` — service-role client (worker only)
- `lib/queue/index.ts` — BullMQ queues + `enqueue`
- `lib/queue/ratelimit.ts` — Redis fixed-window limiter
- `worker/index.ts` — job processor
- `app/api/health/route.ts` — liveness endpoint
- `Caddyfile` — reverse proxy + TLS
- `supabase/fixes/performance_indexes.sql` — indexes
- `load-tests/smoke.js` — k6 scenario

**Modified:**
- `next.config.ts` — restrict `images.remotePatterns`
- `lib/data.ts` — `unstable_cache` + anon client on public reads
- `app/(site)/layout.tsx` — remove `getCurrentUser()`
- `app/(site)/events/[id]/page.tsx` — split auth-gated UI to client
- `app/reflections/page.tsx`, `app/pledges/[eventId]/page.tsx` — same split
- `app/api/registration/route.ts`, `app/api/pledges/route.ts`, `app/api/reports/route.ts` — enqueue instead of `after()`
- `proxy.ts` — narrow matcher
- `lib/supabase/proxy.ts` — cache the profile lookup
- `docker-compose.yml` — redis, worker, caddy, replicas, limits, healthchecks
- `.env`, `.env.example` — `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL`
