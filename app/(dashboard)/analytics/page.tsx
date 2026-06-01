import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics",
  description:
    "Track your GATE preparation progress — accuracy trends, subject-wise performance, topic mastery, and daily practice streaks.",
};

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-6xl">
      <AnalyticsDashboard />
    </div>
  );
}
