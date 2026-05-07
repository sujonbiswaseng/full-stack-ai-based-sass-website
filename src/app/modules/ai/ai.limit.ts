import AppError from "../../errorHelper/AppError";
import { prisma } from "../../lib/prisma";

const DAILY_LIMIT = 10;

export const checkAndUpdateAiLimit = async (userId: string) => {
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, "Authenticated user not found");
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const lastReset = user.promptResetAt
    ? new Date(user.promptResetAt)
    : null;

  // 🔥 RESET LOGIC
  if (lastReset && lastReset < startOfToday) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        promptCount: 0,
        promptResetAt: null,
      },
    });

    user.promptCount = 0;
  }

  if (
    user.plan === "FREE" &&
    user.role !== "ADMIN" &&
    user.promptCount >= DAILY_LIMIT
  ) {
    const resetTime = new Date();
    resetTime.setDate(resetTime.getDate() + 1);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        promptResetAt: resetTime,
      },
    });

    throw new AppError(
      400,
      "Daily limit reached. Try again after 24 hours."
    );
  }

  return {
    allowed: true,
    remaining: DAILY_LIMIT - (user.promptCount + 1),
  };
};