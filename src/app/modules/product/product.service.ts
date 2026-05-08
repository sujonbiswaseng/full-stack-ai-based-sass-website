import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { IRequestUser } from "../../interface/requestUser.interface";
import { ICreateProduct } from "./product.interface";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/pino";

const createProduct = async (user: IRequestUser, payload: ICreateProduct) => {
    try {
      if (!payload.images) {
        throw new AppError(status.BAD_REQUEST, "Image is required to create an product.");
      }
      const product = await prisma.product.create({
        data: {
          ...payload,
          userId: user.userId,
        },
      });
      return product;
    } catch (error:any) {
     if (typeof logger !== "undefined" && logger && typeof logger.error === "function") {
       logger.error({ err: error.message }, "Failed to create product");
     }
     throw new AppError(400, `'Failed to create product. Please try again later,error:${error.message}.'`);

    }
  };

  export const ProductServices={createProduct}