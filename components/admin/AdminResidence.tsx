"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, MonitorPlay } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ResidenceStat } from "@/lib/data";

const BLUE = "#003366";
const GOLD = "#d9b45b";

export function AdminResidence({ stats }: { stats: ResidenceStat[] }) {
  const total = stats.reduce((sum, s) => sum + s.count, 0);
  const top = stats[0];
  const chartHeight = Math.max(240, stats.length * 34);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Wits Residence
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} {total === 1 ? "member" : "members"} across {stats.length}{" "}
            {stats.length === 1 ? "residence" : "residences"}
            {top ? ` · leading: ${top.residence} (${top.count})` : ""}.
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="shrink-0 bg-primary text-white hover:bg-primary/90"
        >
          <Link
            href="/present/residence"
            target="_blank"
            rel="noopener noreferrer"
          >
            <MonitorPlay className="size-5" />
            Present
          </Link>
        </Button>
      </div>

      {stats.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <Building2 className="size-6 text-gray-400" />
          <h3 className="mt-3 text-base font-semibold text-gray-900">
            No residence data yet
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Members who select a Wits residence during onboarding will appear
            here.
          </p>
        </Card>
      ) : (
        <Card className="border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900">
            Members per residence
          </h3>
          <div className="mt-4 w-full" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats}
                layout="vertical"
                margin={{ left: 8, right: 44, top: 4, bottom: 4 }}
              >
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis
                  type="category"
                  dataKey="residence"
                  width={190}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip cursor={{ fill: "rgba(0,51,102,0.05)" }} />
                <Bar
                  dataKey="count"
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                  label={{
                    position: "right",
                    fill: "#003366",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {stats.map((entry, index) => (
                    <Cell
                      key={entry.residence}
                      fill={index === 0 ? GOLD : BLUE}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
