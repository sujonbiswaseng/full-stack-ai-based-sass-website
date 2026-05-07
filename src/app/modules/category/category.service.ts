import { prisma } from "../../lib/prisma";

import { ICreateCategory, IUpdateCategory } from "./category.interface";
import AppError from "../../errorHelper/AppError";
import status from "http-status";
import { parseDateForPrisma } from "../../utils/parseDate";
import { CategoryWhereInput, ProductWhereInput } from "../../../generated/prisma/models";
const CreateCategory = async (data: ICreateCategory, email: string) => {
  if(!data.image){
    throw new AppError(404, "Image is required");
  }
  const adminUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!adminUser) {
    throw new AppError(status.UNAUTHORIZED, "Admin user not found or unauthorized");
  }

  const adminId = adminUser.id;
  const categorydata = await prisma.category.findUnique({
    where: {
      name: data.name,
    },
  });

  if (categorydata) {
    throw new AppError(409, "Category already exists");
  }

  await prisma.user.findUniqueOrThrow({
    where: { id: adminId },
  });


  const result = await prisma.category.create({
    data: {
      ...data,
      adminId: adminId,
    },
  });

  return result;
};

const getCategory = async ( 
  data?: Record<string, any>,
  page?: number,
  limit?: number | undefined,
  skip?: number,
  ) => {

    const andConditions: CategoryWhereInput[] = [];

    if (data?.name) {
      andConditions.push({
        name: data.name
      });
    }


    if (data?.createdAt) {
      const dateRange = parseDateForPrisma(data.createdAt);
      andConditions.push({ createdAt: dateRange.gte });
    }
    if (data?.adminId) {
      andConditions.push({
        adminId: {
          contains: data.adminId,
          mode: "insensitive",
        },
      });
    }

    if (data?.id) {
      andConditions.push({
        id: {
          contains: data.id,
          mode: "insensitive",
        },
      });
    }
  const result = await prisma.category.findMany({
    where:{
      AND:andConditions
    },
    include: {
      products: true,
      user: true,
    },
    orderBy: { name: "desc" },
  });

  const total=await prisma.category.count({where:{
    AND:andConditions
  }})
  return {
    result,
    pagination: {
      total,
      page,
      limit,
      totalpage: Math.ceil(total / limit!) || 1,
    },
}};

const SingleCategory = async (
  id: string,
  query?: Record<string, any>,
  page?: number,
  limit?: number | undefined,
  skip?: number,
  search?:any

) => {

  const andConditions:ProductWhereInput | ProductWhereInput[] | undefined = [];


  if (query) {
    const orConditions: any[] = [];
    if (query.title) {
      orConditions.push({
        title: {
          contains: query.title,
          mode: "insensitive",
        },
      });
    }

    if (query.createdAt) {
      const dateRange = parseDateForPrisma(query.createdAt);
      andConditions.push({ createdAt: dateRange.gte });
    }
    if (query.date) {
      const dateRange = parseDateForPrisma(query.date);
      andConditions.push({date: dateRange});
    }

    if (search) {
      orConditions.push(
        {
          title: {
            contains: query.search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: query.search,
            mode: "insensitive",
          },
        },
        {
          venue: {
            contains: query.search,
            mode: "insensitive",
          },
        }
      );
    }

    if (query.description) {
      orConditions.push({
        description: {
          contains: query.description,
          mode: "insensitive",
        },
      });
    }
    if (query.categories) {
      orConditions.push({
        categories: query.categories,
      });
    }
    if (orConditions.length > 0) {
      andConditions.push({ OR: orConditions });
    }
  }


  if (query?.fee) {
    andConditions.push({
      price: {
        gte: 1,
        lte: Number(query.fee),
      },
    });
  }


  const result = await prisma.category.findFirstOrThrow({
    where: { id },
    include: {
      products: {
        include: {
          reviews: true,
        },
      },
      user: true,
    },
  });


  const products = await prisma.product.findMany({
    where: {
      category_name: result.name,
      AND:andConditions
    },
    take: limit,
      skip,
      include: {
        reviews: {
          where: { rating: { gt: 0 } },
        },
        user:{
          select:{
            id:true,
            name:true,
            email:true,
            phone:true,
            image:true
          }
        }
      },
      orderBy: {
        createdAt:"desc"
      },
  });

  const eventdata=products.map((product) => {
    const totalReviews = product.reviews.length;
    const avgRating =
      totalReviews > 0
        ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    return { ...product, avgRating, totalReviews };
  });

   const total = await prisma.product.count({ where: { AND: andConditions } });

  return {
     data:{
      result,
      eventdata
     },
    pagination: {
      total,
      page,
      limit,
      totalpage: Math.ceil(total / limit!) || 1,
    },
  };
};

const UpdateCategory = async (id: string, data: IUpdateCategory) => {
 
  const { name } = data;
  if(!data.image){
    throw new AppError(404, "Image is required");
  }
  const existcategory = await prisma.category.findUniqueOrThrow({
    where: { id },
  });
  if (existcategory.name == name) {
    throw new AppError(409,"Category name is already up to date.");
  }
  const result = await prisma.category.update({
    where: {
      id,
    },
    data: {
      ...data
    },
  });
  return result;
};

const DeleteCategory = async (id: string) => {
  await prisma.category.findUniqueOrThrow({ where: { id } });
  const result = await prisma.category.delete({
    where: { id },
  });
  return result;
};

export const categoryService = {
  CreateCategory,
  getCategory,
  UpdateCategory,
  DeleteCategory,
  SingleCategory,
};
