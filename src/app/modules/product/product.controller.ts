import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { sendResponse } from "../../shared/sendResponse";
import { ProductServices } from "./product.service";
import { logger } from "../../lib/pino";
import paginationSortingHelper from "../../helpers/paginationHelping";

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
        throw new AppError(400,`${error.message} fsdfsdafsdfdsf`)
    }
  });

  const getAllProducts = catchAsync(async (req: Request, res: Response) => {
    try {
      const { page, limit, skip, sortBy, sortOrder } = paginationSortingHelper(req.query);
      const { search } = req.query;
      const { is_featured } = req.query;

      const is_featureddata = is_featured
        ? req.query.is_featured === "true"
          ? true
          : req.query.is_featured === "false"
            ? false
            : undefined
        : undefined;
      
      const products = await ProductServices.getAllProducts(
        req.query, 
        page, 
        limit, 
        skip, 
        is_featureddata, 
        search as string
      );
      
      sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "All products fetched successfully",
        data: products,
      });
    } catch (error:any) {
      logger.error(error.message);
      throw new AppError(400, `${error.message}`);
    }
  });
  const getSingleProduct = catchAsync(async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const product = await ProductServices.getSingleProduct(productId as string);

      sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Product fetched successfully",
        data: product,
      });
    } catch (error: any) {
      logger.error(error.message);
      throw new AppError(400, `${error.message}`);
    }
  });

  const updateProduct = catchAsync(async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const updateData = req.body;

      const updatedProduct = await ProductServices.updateProduct(productId as string, updateData);

      sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Product updated successfully",
        data: updatedProduct,
      });
    } catch (error: any) {
      logger.error(error.message);
      throw new AppError(400, `${error.message}`);
    }
  });
  

  export const ProductController={
    createProduct,
    getAllProducts,
    getSingleProduct,
    updateProduct
  }