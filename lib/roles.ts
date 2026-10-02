import type { UserRole } from "@/lib/types";

// Display labels for user roles. Internally the role value stays "volunteer",
// but it is shown to users as "Support Team".
export const ROLE_LABELS: Record<UserRole, string> = {
  user: "User",
  volunteer: "Support Team",
  admin: "Admin",
};

export function roleLabel(role: UserRole | string | null | undefined) {
  if (!role) return "—";
  return ROLE_LABELS[role as UserRole] ?? role;
}
