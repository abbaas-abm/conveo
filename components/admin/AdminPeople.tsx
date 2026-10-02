"use client";

import * as React from "react";
import { Loader2, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils";
import { roleLabel } from "@/lib/roles";
import type { Profile, UserRole } from "@/lib/types";

const ROLES: UserRole[] = ["user", "volunteer", "admin"];

const ROLE_BADGE: Record<UserRole, "secondary" | "blue" | "default"> = {
  user: "secondary",
  volunteer: "blue",
  admin: "default",
};

export function AdminPeople({ profiles }: { profiles: Profile[] }) {
  const [items, setItems] = React.useState(profiles);
  const [query, setQuery] = React.useState("");
  const [savingId, setSavingId] = React.useState<string | null>(null);

  const filtered = items.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      `${p.first_name ?? ""} ${p.last_name ?? ""}`
        .toLowerCase()
        .includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.faculty ?? "").toLowerCase().includes(q)
    );
  });

  async function updateRole(userId: string, role: UserRole) {
    setSavingId(userId);
    const previous = items;
    setItems((prev) =>
      prev.map((p) => (p.id === userId ? { ...p, role } : p)),
    );
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", userId);
      if (error) throw error;
      toast.success(`Role updated to ${roleLabel(role)}.`);
    } catch (error) {
      setItems(previous);
      toast.error(
        error instanceof Error ? error.message : "Could not update role.",
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" />
          {items.length} {items.length === 1 ? "user" : "users"}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users..."
            className="pl-10"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <Users className="size-6 text-gray-400" />
          <h3 className="mt-3 text-base font-semibold text-gray-900">
            No users found
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Try a different search term.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden border-gray-200 p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-slate-50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Position</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Change role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((person) => (
                  <tr key={person.id} className="bg-white">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(person.first_name, person.last_name)}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">
                            {[person.first_name, person.last_name]
                              .filter(Boolean)
                              .join(" ") || "Unnamed"}
                          </p>
                          {person.person_number && (
                            <p className="text-xs text-muted-foreground">
                              ID: {person.person_number}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{person.email}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {person.position ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={ROLE_BADGE[person.role]}>
                        {roleLabel(person.role)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Select
                          value={person.role}
                          onValueChange={(value) =>
                            updateRole(person.id, value as UserRole)
                          }
                          disabled={savingId === person.id}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {roleLabel(role)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {savingId === person.id && (
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
