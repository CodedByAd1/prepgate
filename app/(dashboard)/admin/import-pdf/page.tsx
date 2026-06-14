import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ImportDashboard } from "@/components/admin/pdf-import/import-dashboard";

export const metadata: Metadata = {
  title: "Admin · Import PDF | PrepGate",
  description:
    "Upload GATE question paper PDFs and extract questions automatically using Gemini Vision.",
};

export default async function ImportPdfPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <ImportDashboard />;
}
