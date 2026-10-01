"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/utils";
import {
  FACULTY_OPTIONS,
  GENDER_OPTIONS,
  YEAR_OPTIONS,
} from "@/lib/profile-options";
import type { Profile } from "@/lib/types";

const schema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Surname is required"),
  gender: z.string().optional(),
  phone_number: z.string().optional(),
  person_number: z.string().optional(),
  faculty: z.string().optional(),
  course_of_study: z.string().optional(),
  year_of_study: z.string().optional(),
});

type Values = z.infer<typeof schema>;

export function ProfilePanel({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: profile.first_name ?? "",
      last_name: profile.last_name ?? "",
      gender: profile.gender ?? "",
      phone_number: profile.phone_number ?? "",
      person_number: profile.person_number ?? "",
      faculty: profile.faculty ?? "",
      course_of_study: profile.course_of_study ?? "",
      year_of_study: profile.year_of_study ?? "",
    },
  });

  const isStudent = profile.position === "STUDENT";
  const genderValue = useWatch({ control: form.control, name: "gender" });
  const facultyValue = useWatch({ control: form.control, name: "faculty" });
  const yearValue = useWatch({ control: form.control, name: "year_of_study" });
  const av = initials(profile.first_name, profile.last_name);

  async function onSubmit(values: Values) {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          gender: values.gender || null,
          phone_number: values.phone_number?.trim() || null,
          person_number: values.person_number?.trim() || null,
          faculty: isStudent ? values.faculty || null : null,
          course_of_study: isStudent
            ? values.course_of_study?.trim() || null
            : null,
          year_of_study: isStudent ? values.year_of_study || null : null,
        })
        .eq("id", profile.id);
      if (error) throw error;
      toast.success("Profile updated successfully.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-gray-200">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary text-lg font-medium text-white">
            {av || <UserRound className="size-6" />}
          </div>
          <div>
            <CardTitle className="text-lg text-gray-900">
              {[profile.first_name, profile.last_name]
                .filter(Boolean)
                .join(" ") || "Your profile"}
            </CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span>{profile.email}</span>
              {profile.position && (
                <Badge variant={isStudent ? "blue" : "secondary"}>
                  {profile.position}
                </Badge>
              )}
              <Badge variant="outline">{profile.role}</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">
            Personal &amp; academic information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="First name"
                error={form.formState.errors.first_name?.message}
              >
                <Input {...form.register("first_name")} />
              </Field>
              <Field
                label="Surname"
                error={form.formState.errors.last_name?.message}
              >
                <Input {...form.register("last_name")} />
              </Field>
              <Field label="Gender">
                <Select
                  value={genderValue || undefined}
                  onValueChange={(value) =>
                    form.setValue("gender", value, { shouldDirty: true })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Phone number">
                <Input
                  placeholder="e.g. 072 123 4567"
                  {...form.register("phone_number")}
                />
              </Field>
              <Field label={isStudent ? "Student number" : "Staff ID number"}>
                <Input {...form.register("person_number")} />
              </Field>
              {isStudent && (
                <>
                  <Field label="Faculty">
                    <Select
                      value={facultyValue || undefined}
                      onValueChange={(value) =>
                        form.setValue("faculty", value, { shouldDirty: true })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select faculty" />
                      </SelectTrigger>
                      <SelectContent>
                        {FACULTY_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Course of study">
                    <Input {...form.register("course_of_study")} />
                  </Field>
                  <Field label="Year of study">
                    <Select
                      value={yearValue || undefined}
                      onValueChange={(value) =>
                        form.setValue("year_of_study", value, {
                          shouldDirty: true,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEAR_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              )}
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
