import z from "zod";
import { createReviewsData, moderateData, updateReviewsData } from "./reviews.validation";

// create reviews type
export type ICreatereviewData=z.infer<typeof createReviewsData>

// update reviews type
export type IUpdatereviewData=z.infer<typeof updateReviewsData>

// moderate reviews type
export type ImoderateUpdatereviewData=z.infer<typeof moderateData>