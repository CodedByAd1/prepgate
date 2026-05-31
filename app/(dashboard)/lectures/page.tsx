import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LecturesClient } from "@/components/lectures/lectures-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lecture Hub",
  description: "Curated YouTube playlists for all 13 GATE CSE subjects.",
};

export default async function LecturesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Fetch all published playlists server-side for initial render
  const playlists = await prisma.playlist.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      youtubePlaylistId: true,
      thumbnail: true,
      instructor: true,
      totalVideos: true,
      subject: true,
    },
  });

  return <LecturesClient initialPlaylists={playlists} />;
}
