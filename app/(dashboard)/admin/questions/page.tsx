import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { QuestionsManager } from "@/components/admin/questions-manager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin · Question Bank",
  description: "Add, edit, and manage GATE PYQ questions.",
};

export default async function AdminQuestionsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <QuestionsManager />;
}
