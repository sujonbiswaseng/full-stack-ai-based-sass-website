import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/pino";
import { NewsletterWhereInput } from "../../../generated/prisma/models";
import { parseDateForPrisma } from "../../utils/parseDate";

const createNewsletter = async (payload: { email: string; userId: string }) => {
  logger.debug({ email: payload.email }, "Creating newsletter subscription");
  if (!payload.email || !payload.userId) {
    throw new AppError(status.BAD_REQUEST, "Email and userId are required to subscribe to the newsletter.");
  }

  const existing = await prisma.newsletter.findUnique({
    where: { email: payload.email },
  });
  if (existing) {
    throw new AppError(status.CONFLICT, "This email is already subscribed to the newsletter.");
  }

  const newsletter = await prisma.newsletter.create({
    data: {
      email: payload.email,
      userId: payload.userId,
    },
  });

  return newsletter;
};

const getAllNewsletters = async (
  query?: Record<string, any>,
  page?: number,
  limit?: number | undefined,
  skip?: number,) => {
  const andConditions: NewsletterWhereInput[]  = [];
  if (query?.email) {
    andConditions.push({
      email: {
        contains: query.email,
        mode: "insensitive",
      },
    });
  }
  if (query?.createdAt) {
    const dateRange = parseDateForPrisma(query.createdAt);
    andConditions.push({ createdAt: dateRange.gte });
  }
  const newsletters = await prisma.newsletter.findMany({
    skip: skip || ((page && limit) ? (page - 1) * limit : undefined),
    take: limit,
    where:{AND:andConditions},
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });
  const total = await prisma.newsletter.count({ where :{AND:andConditions}});
  return {
    data: newsletters,
    pagination: {
      total,
      page: page || 1,
      limit: 9,
      totalpage: limit ? Math.ceil(total / limit) : 1,
    },
  };
};

// Get a single newsletter subscription by ID
const getSingleNewsletter = async (newsletterId: string) => {
  const newsletter = await prisma.newsletter.findUnique({
    where: { id: newsletterId },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });
  if (!newsletter) {
    throw new AppError(status.NOT_FOUND, "Newsletter subscription not found");
  }
  return newsletter;
};

const updateNewsletter = async (
  newsletterId: string,
  payload: { email?: string }
) => {
  const newsletter = await prisma.newsletter.findUnique({
    where: { id: newsletterId },
  });

  if (!newsletter) {
    throw new AppError(status.NOT_FOUND, "Newsletter subscription not found");
  }

  // If email is being updated, check for uniqueness
  if (payload.email && payload.email !== newsletter.email) {
    const existing = await prisma.newsletter.findUnique({
      where: { email: payload.email },
    });
    if (existing) {
      throw new AppError(status.CONFLICT, "This email is already subscribed to the newsletter.");
    }
  }

  const updatedNewsletter = await prisma.newsletter.update({
    where: { id: newsletterId },
    data: payload,
  });

  return updatedNewsletter;
};

// Delete a newsletter subscription by ID
const deleteNewsletter = async (newsletterId: string) => {
  const newsletter = await prisma.newsletter.findUnique({
    where: { id: newsletterId },
  });
  if (!newsletter) {
    throw new AppError(status.NOT_FOUND, "Newsletter subscription not found");
  }
  const deletedNewsletter = await prisma.newsletter.delete({
    where: { id: newsletterId },
  });
  return deletedNewsletter;
};

export const NewsletterService = {
  createNewsletter,
  getAllNewsletters,
  getSingleNewsletter,
  updateNewsletter,
  deleteNewsletter,
};
