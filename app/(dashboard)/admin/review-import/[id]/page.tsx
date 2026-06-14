import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ReviewInterface } from "@/components/admin/pdf-import/review-interface";

export const metadata: Metadata = {
  title: "Admin · Review Import | PrepGate",
  description: "Review and approve extracted GATE questions from PDF imports.",
};

export default async function ReviewImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  return <ReviewInterface importId={id} />;
}
