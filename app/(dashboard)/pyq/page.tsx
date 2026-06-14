import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { QuestionPapers } from "@/components/pyq/question-papers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Question Papers",
  description:
    "Browse and view official GATE CSE question paper PDFs, year by year.",
};

export default async function PYQPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <QuestionPapers />;
}
