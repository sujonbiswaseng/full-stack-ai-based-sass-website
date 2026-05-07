import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { NewsletterService } from "./newsletter.service";
import paginationSortingHelper from "../../helpers/paginationHelping";

// Create a new newsletter subscription
const createNewsletter = catchAsync(async (req: Request, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError(status.UNAUTHORIZED, "Unauthorized access. Please login first.");
  }
const {email}=req.body
console.log(email,'email')
 

  const result = await NewsletterService.createNewsletter({email,userId:req.user.userId as string});

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Newsletter subscription created successfully",
    data: result,
  });
});

// Get all newsletter subscriptions
const getAllNewsletters = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip, sortBy, sortOrder } = paginationSortingHelper(req.query);
  const result = await NewsletterService.getAllNewsletters(req.query,page,limit,skip);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Newsletters fetched successfully",
    data: result,
  });
});

// Get single newsletter subscription by ID
const getSingleNewsletter = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await NewsletterService.getSingleNewsletter(id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Newsletter fetched successfully",
    data: result,
  });
});

// Update a newsletter subscription by ID
const updateNewsletter = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const payload = {
    ...(req.body.email !== undefined && { email: req.body.email }),
  };

  const result = await NewsletterService.updateNewsletter(id as string, payload);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Newsletter updated successfully",
    data: result,
  });
});

// Delete a newsletter subscription by ID
const deleteNewsletter = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await NewsletterService.deleteNewsletter(id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Newsletter deleted successfully",
    data: result,
  });
});

export const NewsletterController = {
  createNewsletter,
  getAllNewsletters,
  getSingleNewsletter,
  updateNewsletter,
  deleteNewsletter,
};
