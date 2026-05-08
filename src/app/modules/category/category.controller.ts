import { NextFunction, Request, Response } from "express";
import { categoryService } from "./category.service";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { status } from "http-status";
import paginationSortingHelper from "../../helpers/paginationHelping";
import { logger } from "../../lib/pino";

const CreateCategory = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
      return res
        .status(status.UNAUTHORIZED)
        .json({ success: false, message: "you are unauthorized" });
    }
    const payload = {
      ...req.body,
      image:req.file?.path || req.body.image
  };
    const result = await categoryService.CreateCategory(
      payload,
      user.email as string,
    );
    sendResponse(res, {
      httpStatusCode: status.CREATED,
      success: true,
      message: 'your category has been created',
      data: result,
    });
  },
);

const getCategory = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip, sortBy, sortOrder } = paginationSortingHelper(
    req.query,
  );
  const result = await categoryService.getCategory(req.query,page,limit,skip);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "retrieve category successfully",
    data: result,
  });
});

const SingleCategory = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = paginationSortingHelper(req.query);
  logger.debug({ query: req.query }, "Fetching single category");
  const result = await categoryService.SingleCategory(
    req.params.id as string,
    req.query,
    page,
    limit,
    skip,
    typeof req.query.search === "string" ? req.query.search : undefined
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "retrieve single category successfully",
    data: result,
  });
});

const UpdateCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryService.UpdateCategory(
    req.params.id as string,
    req.body,
  );
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "your category has beed changed",
    data: result,
  });
});

const DeleteCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryService.DeleteCategory(req.params.id as string);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "your category has beed deleted",
    data: result,
  });
});

export const CategoryController = {
  CreateCategory,
  getCategory,
  UpdateCategory,
  DeleteCategory,
  SingleCategory,
};
