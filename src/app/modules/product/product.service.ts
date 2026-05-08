import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { IRequestUser } from "../../interface/requestUser.interface";
import { ICreateProduct, IupdateProduct } from "./product.interface";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/pino";
import { parseDateForPrisma } from "../../utils/parseDate";
import { Product } from "../../../generated/prisma/client";

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

const getAllProducts = async (
  query: Record<string, any> = {},
  page: number = 1,
  limit: number = 10,
  skip: number = 0,
  is_featureddata?: boolean,
  search?: string
) => {
    const andConditions: any[] = [];
    const orConditions: any[] = [];

    if (search) {
      orConditions.push(
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          category_name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          location: {
            contains: search,
            mode: "insensitive",
          },
        },
 
      );
    }

    if (is_featureddata) {
        andConditions.push({
          is_featured: is_featureddata,
        });
      }

    if (query) {

        if (query.createdAt) {
            const dateRange = parseDateForPrisma(query.createdAt);
            andConditions.push({ createdAt: dateRange.gte });
          }

    if (query?.price) {
      andConditions.push({
        price: {
          gte: 0,
          lte: Number(query.price),
        },
      });

      if (orConditions.length > 0) {
        andConditions.push({ OR: orConditions });
      }
    }
    if (query?.status) {
      andConditions.push({
        status: query.status,
      });
    }

    const products=await prisma.product.findMany({
        take: limit,
        skip,
        where:{
            AND:andConditions
        },
        include:{
            user:true,
            useractivity:true,
            reviews:true,
            orderitems:true
        }
    })
    const product=products.map((item)=>{
        const totalReviews=item.reviews.length;
        const avgRating =
        totalReviews > 0
          ? item.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
          : 0;

      return { ...item, avgRating, totalReviews };
    })
    const total = await prisma.product.count({ where: { AND: andConditions } });

    return {
      data: product,
      pagination: {
        total,
        page,
        limit,
        totalpage: Math.ceil(total / limit) || 1,
      },
    };
  }
}

const  getSingleProduct=async(productId: string) =>{
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        user: true,
        useractivity: true,
        reviews: true,
        orderitems: true,
      },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    const relatedItems=await prisma.product.findMany({
        where:{
            category_name:product.category_name
        }
    })

    const totalReviews = product.reviews.length;
    const avgRating =
      totalReviews > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    return { ...product,...relatedItems, avgRating, totalReviews };
  }

const updateProduct = async (productId: string, payload:IupdateProduct) => {

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new Error("Product not found");
    }
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { ...payload}
    });

    return updatedProduct;
  } catch (error) {
    logger.error((error as Error).message || "Unknown error occurred while updating product category");
    throw new AppError(400, (error as Error).message || "An error occurred while updating product category.");
  }
};




  export const ProductServices={createProduct,getAllProducts,getSingleProduct,updateProduct}