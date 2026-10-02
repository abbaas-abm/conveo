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
};

function getConnection(): IORedis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  if (!globalForQueue.__conveoRedis) {
    const redis = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });
    redis.on("error", (error) => {
      console.error("[queue] redis error:", error.message);
    });
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
        registrations: new Queue("registrations", { connection }),
        pledges: new Queue("pledges", { connection }),
        reports: new Queue("reports", { connection }),
      }
    : null;
  return globalForQueue.__conveoQueues;
}

/**
 * Adds a job to the queue. Returns `false` when Redis is not configured or
 * unreachable, so callers can fall back to inline delivery via `after()`.
 */
export async function enqueue(
  queue: QueueName,
  jobName: string,
  data: object,
): Promise<boolean> {
  const queues = getQueues();
  if (!queues) return false;
  try {
    await queues[queue].add(jobName, data, {
      attempts: 6,
      backoff: { type: "exponential", delay: 10000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
    return true;
  } catch (error) {
    console.error(`[queue] enqueue "${queue}" failed:`, error);
    return false;
  }
}
