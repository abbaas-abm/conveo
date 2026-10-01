"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CalendarCheck, UserRound } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfilePanel } from "./ProfilePanel";
import { MyEventsPanel } from "./MyEventsPanel";
import type { Profile } from "@/lib/types";
import type { RsvpWithEvent } from "@/lib/data";

export function UserDashboard({
  profile,
  rsvps,
}: {
  profile: Profile;
  rsvps: RsvpWithEvent[];
}) {
  const [tab, setTab] = React.useState("profile");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-white p-1.5 shadow-sm">
          <TabsTrigger value="profile">
            <UserRound className="size-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="events">
            <CalendarCheck className="size-4" />
            My Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfilePanel profile={profile} />
        </TabsContent>
        <TabsContent value="events">
          <MyEventsPanel rsvps={rsvps} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
