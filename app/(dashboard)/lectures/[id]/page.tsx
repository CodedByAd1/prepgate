import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PlaylistDetailClient } from "@/components/lectures/playlist-detail-client";
import type { Metadata } from "next";

interface PlaylistPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PlaylistPageProps): Promise<Metadata> {
  const { id } = await params;
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    select: { title: true, instructor: true },
  });
  if (!playlist) return { title: "Playlist not found" };
  return {
    title: playlist.title,
    description: `Watch all videos by ${playlist.instructor} and track your progress.`,
  };
}

export default async function PlaylistDetailPage({ params }: PlaylistPageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  // Fetch playlist with all videos + this user's progress in one query
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      videos: {
        orderBy: { orderIndex: "asc" },
        include: {
          progress: {
            where: { userId: session.user!.id as string },
            select: { completed: true },
          },
        },
      },
    },
  });

  if (!playlist) notFound();

  return (
    <PlaylistDetailClient
      playlistId={playlist.id}
      title={playlist.title}
      youtubePlaylistId={playlist.youtubePlaylistId}
      thumbnail={playlist.thumbnail}
      instructor={playlist.instructor}
      subject={playlist.subject}
      description={playlist.description}
      totalVideos={playlist.totalVideos}
      initialVideos={playlist.videos}
    />
  );
}
