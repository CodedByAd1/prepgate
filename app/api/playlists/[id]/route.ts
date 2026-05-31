import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── GET /api/playlists/[id] ── playlist + videos + user progress ─────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      videos: {
        orderBy: { orderIndex: "asc" },
        include: {
          progress: {
            where: { userId: session.user!.id as string },
          },
        },
      },
    },
  });

  if (!playlist) {
    return Response.json({ error: "Playlist not found" }, { status: 404 });
  }

  return Response.json({ playlist });
}

// ─── DELETE /api/playlists/[id] ───────────────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const playlist = await prisma.playlist.findUnique({ where: { id } });
  if (!playlist) {
    return Response.json({ error: "Playlist not found" }, { status: 404 });
  }

  await prisma.playlist.delete({ where: { id } });
  return Response.json({ success: true });
}
