import { NextFunction, Request, Response } from "express"
import { ReviewsService } from "./reviews.service"
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import paginationSortingHelper from "../../helpers/paginationHelping";

const CreateReviews =catchAsync(async (req: Request, res: Response) => {
         const user = req.user
        if (!user) {
           return res.status(401).json({ success: false, message: "you are unauthorized" })
        }
        const result=await ReviewsService.CreateReviews(user.userId,req.params.id as string,req.body)
        sendResponse(res,{
            httpStatusCode:status.CREATED,
            success:true,
            message:'your review has been created successfully',
            data:result

        })
})

const updateReview = catchAsync(async (req: Request, res: Response) => {
      const user = req.user;
       if (!user) {
           return res.status(401).json({ success: false, message: "you are unauthorized" })
        }
        const { reviewid } = req.params;
        const result = await ReviewsService.updateReview(reviewid as string, req.body, user?.userId as string)
            sendResponse(res,{
                httpStatusCode:status.OK,
                success:true,
                message:"review update successfully",
                data:result
            })
} )

const deleteReview = catchAsync(async (req: Request, res: Response) => {
      const user = req.user;
       if (!user) {
           return res.status(401).json({ success: false, message: "you are unauthorized" })
        }
        const { reviewid } = req.params;
        const result = await ReviewsService.deleteReview(reviewid as string, user?.userId as string)
            sendResponse(res,{
                httpStatusCode:status.OK,
                success:true,
                message:"review delete successfully",
                data:result
            })
}
)

const moderateReview = catchAsync(async (req: Request, res: Response) => {
        const { reviewid } = req.params;
        const result = await ReviewsService.moderateReview(reviewid as string, req.body)
            sendResponse(res,{
                httpStatusCode:status.OK,
                success:true,
                message:"review moderate successfully",
                data:result
                })
})

const getReviewByid = catchAsync(async (req: Request, res: Response) => {
            const  {reviewid}  = req.params;
        const result = await ReviewsService.getReviewByid(reviewid as string)
            sendResponse(res,{
                httpStatusCode:status.OK,
                success:true,
                message:"retrieve review by id successfully",
                data:result
            })
}
)
const getAllreviews=catchAsync(async (req: Request, res: Response) => {
    const { page, limit, skip, sortBy, sortOrder } = paginationSortingHelper(
        req.query,
      );
      const {search}=req.query
    const result = await ReviewsService.getAllreviews(req.query as any, page, limit, skip, sortBy, sortOrder,search as string)
    sendResponse(res,{
        httpStatusCode:status.OK,
        success:true,
        message:"retrieve all reviews successfully",
        data:result
    })
}
)
export const ReviewsController={CreateReviews,updateReview,deleteReview,getReviewByid,moderateReview,getAllreviews}