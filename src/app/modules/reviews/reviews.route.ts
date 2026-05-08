import { Router } from "express";
import { ReviewsController } from "./reviews.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { createReviewsData, moderateData, updateReviewsData } from "./reviews.validation";
import auth from "../../middleware/Auth";
import { Role } from "../../../generated/prisma/enums";

const router = Router()
router.post('/meal/:id/review', auth([Role.USER]),validateRequest(createReviewsData), ReviewsController.CreateReviews)
router.put("/review/:reviewid", auth([Role.USER]),validateRequest(updateReviewsData), ReviewsController.updateReview)
router.delete("/review/:reviewid", auth([Role.ADMIN,Role.USER]), ReviewsController.deleteReview)
router.get("/reviews", ReviewsController.getAllreviews)
router.get("/review/:reviewid", ReviewsController.getReviewByid)
router.patch("/review/:reviewid/moderate",auth([Role.MANAGER]),validateRequest(moderateData), ReviewsController.moderateReview)
export const ReviewsRouter = { router }