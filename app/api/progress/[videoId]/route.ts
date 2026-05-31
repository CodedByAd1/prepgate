import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/progress/[videoId]
 * Toggle a video's completed status for the authenticated user.
 * Creates the progress record if it doesn't exist yet.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { videoId } = await params;
  const userId = session.user!.id as string;

  // Get current state
  const existing = await prisma.videoProgress.findUnique({
    where: { userId_videoId: { userId, videoId } },
  });

  const newCompleted = !existing?.completed;

  const progress = await prisma.videoProgress.upsert({
    where: { userId_videoId: { userId, videoId } },
    create: {
      userId,
      videoId,
      completed: newCompleted,
      completedAt: newCompleted ? new Date() : null,
    },
    update: {
      completed: newCompleted,
      completedAt: newCompleted ? new Date() : null,
    },
  });

  return Response.json({ progress });
}
