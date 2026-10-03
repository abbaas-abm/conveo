import { Queue } from "bullmq";
import IORedis from "ioredis";

export type QueueName = "registrations" | "pledges" | "reports";

export interface RegistrationJob {
  registrationId: string;
  data: {
    attendeeId: string;
    eventId: string;
    email: string;
    firstName: string;
    lastName: string;
    personNumber: string | null;
    position: string;
    eventTitle: string;
    startDate: string;
    endDate: string;
    venue: string | null;
  };
}

export interface PledgeJob {
  pledgeId: string;
}

export interface ReportJob {
  eventId: string;
  to: string;
}

const globalForQueue = globalThis as unknown as {
  __conveoRedis?: IORedis;
  __conveoQueues?: Record<QueueName, Queue> | null;
  __conveoRedisLoggedAt?: number;
};

// ioredis re-emits an error on every reconnect attempt. When Redis is simply
// not configured (e.g. local dev without Redis) that would flood the logs, so
// throttle it to at most one line a minute.
function logRedisError(error: unknown) {
  const now = Date.now();
  const last = globalForQueue.__conveoRedisLoggedAt ?? 0;
  if (now - last < 60_000) return;
  globalForQueue.__conveoRedisLoggedAt = now;
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[queue] redis unavailable (queue disabled): ${message}`);
}

function getConnection(): IORedis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  if (!globalForQueue.__conveoRedis) {
    const redis = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 500, 5000),
    });
    redis.on("error", logRedisError);
    globalForQueue.__conveoRedis = redis;
  }
  return globalForQueue.__conveoRedis;
}

function getQueues(): Record<QueueName, Queue> | null {
  if (globalForQueue.__conveoQueues !== undefined) {
    return globalForQueue.__conveoQueues;
  }
  const connection = getConnection();
  globalForQueue.__conveoQueues = connection
    ? {
        registrations: makeQueue("registrations", connection),
        pledges: makeQueue("pledges", connection),
        reports: makeQueue("reports", connection),
      }
    : null;
  return globalForQueue.__conveoQueues;
}

function makeQueue(name: QueueName, connection: IORedis) {
  const queue = new Queue(name, { connection });
  queue.on("error", logRedisError);
  return queue;
}

const ENQUEUE_TIMEOUT_MS = 1500;

/**
 * Adds a job to the queue. Returns `false` when Redis is not configured or
 * unreachable (or too slow to answer), so callers can fall back to inline
 * delivery via `after()`. The timeout guarantees we never block a request.
 */
export async function enqueue(
  queue: QueueName,
  jobName: string,
  data: object,
): Promise<boolean> {
  const queues = getQueues();
  if (!queues) return false;
  try {
    const addPromise = queues[queue].add(jobName, data, {
      attempts: 6,
      backoff: { type: "exponential", delay: 10000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
    // Avoid an unhandled rejection if the race below times out first.
    addPromise.catch(() => {});

    await Promise.race([
      addPromise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("enqueue timed out")),
          ENQUEUE_TIMEOUT_MS,
        ),
      ),
    ]);
    return true;
  } catch {
    // Redis is unavailable; caller falls back to inline delivery.
    logRedisError(new Error("enqueue failed"));
    return false;
  }
}
