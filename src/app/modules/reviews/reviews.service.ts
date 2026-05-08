
import { prisma } from "../../lib/prisma"

import { createReviewsData, updateReviewsData } from "./reviews.validation";
import { ICreatereviewData, IUpdatereviewData } from "./reviews.interface";
import AppError from "../../errorHelper/AppError";

import { parseDateForPrisma } from "../../utils/parseDate";
import { ReviewStatus } from "../../../generated/prisma/enums";
import { ReviewWhereInput } from "../../../generated/prisma/models";

const CreateReviews = async (customerid: string, productid: string, data: ICreatereviewData) => {
    const existingproduct = await prisma.product.findUnique({
        where: {
            id: productid
            }
    })
    if(!existingproduct){
        throw new AppError(404, "meal not found for this id")
    }
    const orderMeal = await prisma.orderItem.findFirst({
        where: {
            productId: productid,
            order: {
                buyerid: customerid
            }
        }
    });

    if (!orderMeal) {
        throw new AppError(404, "you can not review for this meal without order")
    }
    if (data.rating >= 6) {
      throw new AppError(400, "rating must be between 1 and 5")
    }

    const result = await prisma.review.create({
        data: {
            userid: customerid,
            productid: productid,
            ...data

        }
    })

    return result

}
const updateReview = async (reviewId: string, data: IUpdatereviewData, authorId: string) => {
  
    const review = await prisma.review.findFirst({
        where: {
            id: reviewId,
            userid: authorId
        },
        select: {
            id: true
        }
    })
    if (!review) {
        throw new AppError(404,"your review not found,please update your own review")
    }

    const result = await prisma.review.update({
        where: {
            id: reviewId,
            userid: authorId
        },
        data: {
            ...data
        }
    })
    return {
        success: true,
        message:`your review update successfully`,
        result
    }
}


const deleteReview = async (reviewid: string, authorid: string) => {
    const review = await prisma.review.findUnique({
        where: {
            id: reviewid,
        },
        select: {
            id: true
        }
    })
    if (!review) {
        throw new AppError(404, "review not found")
    }

    const result = await prisma.review.delete({
        where: {
            id: review.id
        }
    })

    return result
}

const getReviewByid = async (reviewid: string) => {
    const result = await prisma.review.findUnique({
        where: {
            id: reviewid
        },
        include: {
            product: true
        }
    })
    if(!result){
        throw new AppError(404,'review not found')
    }

    return result
}

const moderateReview = async (id: string, data: { status: ReviewStatus }) => {
    const {status}=data

    const reviewData = await prisma.review.findUnique({
        where: {
            id
        },
        select: {
            id: true,
            status: true
        }
    });
    if (!reviewData) {
        throw new AppError(404,'review data not found by id')
    }

    if (reviewData.status === data.status) {
        throw new AppError(409, `Your provided status (${data.status}) is already up to date.`)
    }

    const result = await prisma.review.update({
        where: {
            id
        },
        data:{
            status
        }
    })

    return result
}

const getAllreviews = async (
    data?: Record<string, any>,
    page?: number,
    limit?: number | undefined,
    skip?: number,
    sortBy?: string | undefined,
    sortOrder?: string | undefined,
    search?:string | undefined) => {

        const andConditions: ReviewWhereInput[]  = [];

        if (search) {
          const orConditions: any[] = [];
          orConditions.push(
            {
                comment: {
                contains: search,
                mode: "insensitive",
              },
            },
          );
          if (orConditions.length > 0) {
            andConditions.push({ OR: orConditions });
          }
        }
        if (data?.createdAt) {
            const dateRange = parseDateForPrisma(data.createdAt);
            andConditions.push({ createdAt: dateRange.gte });
          }

          

          if (data?.rating) {
            andConditions.push({
              rating: {
                equals: data.rating,
              },
            });
          }

          if (data?.parentId) {
            andConditions.push({
              parentId: {
                equals: data.parentId,
              },
            });
          }
          
  if (data?.status) {
    andConditions.push({
      status: {
        equals: data.status,
      },
    });
  }
    const result = await prisma.review.findMany({
        take: limit,
        skip,
        where:{
            AND:andConditions
        },
        include: {
            user: true,
            product: true,
            replies: true
        }
    })

    const total=await prisma.review.count({where:{
        AND:andConditions,
      }})

      return {result,
        pagination: {
            total,
            page,
            limit,
            totalpage: Math.ceil(total / limit!) || 1,
          },
        
      };


    return result
}


export const ReviewsService = { CreateReviews, updateReview, deleteReview, getReviewByid, moderateReview, getAllreviews }