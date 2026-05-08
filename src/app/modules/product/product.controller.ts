import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { sendResponse } from "../../shared/sendResponse";
import { ProductServices } from "./product.service";
import { logger } from "../../lib/pino";

const createProduct = catchAsync(async (req: Request, res: Response) => {
    try {
      if (!req.user?.userId) {
        throw new AppError(status.UNAUTHORIZED, "Unauthorized access. Please login first.");
      }
      const files = req.files as Express.Multer.File[];

      const payload = {
        ...req.body,
        images: files?.length ? files.map((file) => file.path) : req.body.images,
      };

      const user = req.user;
      const result = await ProductServices.createProduct(user, payload);

      sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "product created successfully",
        data: result,
      });
    } catch (error:any) {
        logger.error(error.message)
        throw new AppError(400,`${error.message}`)
    }
  });

  export const ProductController={
    createProduct
  }