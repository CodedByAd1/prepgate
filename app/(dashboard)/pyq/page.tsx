import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PYQPractice } from "@/components/pyq/pyq-practice";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PYQ Practice",
  description:
    "Practice GATE Previous Year Questions filtered by subject, topic, year, difficulty, and question type. Track your accuracy and attempt history.",
};

export default async function PYQPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl">
      <PYQPractice />
    </div>
  );
}
