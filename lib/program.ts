import type { ProgramBlockType } from "@/lib/types";

export const PROGRAM_BLOCK_TYPES: ProgramBlockType[] = [
  "KEYNOTE",
  "PANEL_DISCUSSION",
  "WORKSHOP",
  "NETWORKING",
  "BREAK",
  "ENTERTAINMENT",
  "QA_SESSION",
  "OTHER",
];

export const PROGRAM_BLOCK_LABELS: Record<ProgramBlockType, string> = {
  KEYNOTE: "Keynote",
  PANEL_DISCUSSION: "Panel Discussion",
  WORKSHOP: "Workshop",
  NETWORKING: "Networking",
  BREAK: "Break",
  ENTERTAINMENT: "Entertainment",
  QA_SESSION: "Q&A Session",
  OTHER: "Session",
};
