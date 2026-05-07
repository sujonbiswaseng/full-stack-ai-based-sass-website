import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { geminiService } from "./ai.service";
import { sendResponse } from "../../shared/sendResponse";
import AppError from "../../errorHelper/AppError";

const generateArticle=catchAsync(async(req:Request,res:Response)=>{
  const { prompt } = req.body;
  const user = req.user;

  if (!user) {
    throw new AppError(401, "Unauthorized: User data not found");
  }

  const result = await geminiService.generateArticle(
    user.userId,
    user.email,
    prompt as string,
  );

  sendResponse(res, {
    httpStatusCode: 200,
    success: true,
    message: "Article generated successfully",
    data: result,
  });
});

const generateRecommendations = catchAsync(async (req: Request, res: Response) => {
  const { prompt } = req.body;
  const user = req.user;

  if (!user) {
    throw new AppError(401, "Unauthorized: User data not found");
  }

  if (!prompt || typeof prompt !== "string") {
    throw new AppError(400, "Prompt is required");
  }

  const result = await geminiService.generateRecommendations(
    user.userId,
    user.email,
    prompt,
  );

  sendResponse(res, {
    httpStatusCode: 200,
    success: true,
    message: "Recommendations generated successfully",
    data: result,
  });
});



export const geminiController={generateArticle,generateRecommendations}