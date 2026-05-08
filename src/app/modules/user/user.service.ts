import { Role, User, UserStatus } from "../../../generated/prisma/client";
import { UserWhereInput } from "../../../generated/prisma/models";
import AppError from "../../errorHelper/AppError";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/pino";
import { UserQueryOptions } from "./user.interface";

const UpdateUserProfile = async (
  data: Partial<User>,
  userid: string
) => {
  if (!data || Object.keys(data).length === 0) {
    throw new AppError(400, "No profile data provided for update.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userid },
    include: { accounts: true },
  });

  if (!user) {
    throw new AppError(404, "User not found.");
  }

  const isUserRole = user.role === "USER";

  // Prepare update data, only allowing email updates if not USER
  const updateData: Partial<User> = {
    name: data.name,
    image: data.image,
    bgimage: data.bgimage,
    phone: data.phone,
    isActive: data.isActive,
    ...(isUserRole ? {} : { email: data.email }),
  };

  const updatedUser = await prisma.user.update({
    where: { id: userid },
    data: updateData,
  });

  return updatedUser;
};

const GetAllUsers = async (
  data:any,
  page?: number,
  limit?: number | undefined,
  skip?: number,
  sortBy?: string | undefined,
  sortOrder?: string | undefined,
  isemailVerified?:any
 ) => {
   const andCondition: UserWhereInput[] = [];
   if (typeof data.email == "string") {
     andCondition.push({
       email: data?.email,
     });
   }
   if (typeof data?.phone == "string") {
     andCondition.push({
       phone: data?.phone,
     });
     
   }
   if (typeof data?.name == "string") {
    andCondition.push({
      name: data?.name,
    });
    
  }
   if (typeof data?.role == "string") {
     andCondition.push({ role: data?.role as Role });
   }
   if (typeof data?.status == "string") {
     andCondition.push({ status: data?.status as UserStatus });
   }
 
   if (typeof data.isactivequery == "boolean") {
     andCondition.push({ isActive: data.isactivequery });
   }
 
   let result: any = {};
  
    const users = await prisma.user.findMany({
      take: limit,
      skip,
      where: { AND: andCondition,emailVerified:isemailVerified },
      include: {
        reviews: {
          where: { rating: { gt: 0 } },
        },
       products:true,
       accounts:{select:{password:true}}
      },
      orderBy: {
        [sortBy!]:sortOrder
      },
    });

    result = users.map((user) => {
      const totalReviews = user.reviews.length;
      const avgRating =
        totalReviews > 0
          ? user.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
          : 0;

      return { ...user, avgRating, totalReviews };
    })
  const totalusers = await prisma.user.count({
     where: {
       AND: andCondition,
     },
   });
   return {
     data: result,
     pagination: {
       totalusers,
       page:data.page,
       limit:data.limit,
       totalpage: Math.ceil(totalusers / data.limit!) || 1,
     },
   };
 };
 

const OwnProfileDelete = async (userid: string) => {
  logger.debug({ userId: userid }, "Deleting own profile");
  const userData = await prisma.user.findUnique({
    where: { id: userid },
  });
  if (!userData) {
    throw new AppError(404,"your user data not found");
  }
  const result = await prisma.user.delete({
    where: { id: userid },
  });
  return result;
};


const UpdateUser = async (id: string, data: Partial<User>) => {
  const userData = await prisma.user.findUnique({ where: { id } });
  if (!userData) {
    throw new AppError(404,"your user data didn't found");
  }
  if (userData.role == data.role) {
    throw new AppError(409,`your status(${data.role}) already up to date`);
  }
  if (userData.status === data.status) {
    throw new AppError(409, `your status(${data.status}) already up to date`);
  }
  const result = await prisma.user.update({
    where: {
      id,
    },
    data: {
      role: data.role,
      status: data.status,
      email: data.email,
    },
  });
  return result
};

const DeleteUserProfile = async (id: string) => {
  const userData = await prisma.user.findUnique({ where: { id } });
  if (!userData) {
    throw new AppError(404,"your user data didn't found");
  }
  const result = await prisma.user.delete({
    where: { id },
  });
  return result
};

const GetSingleUser = async (id: string) => {
  const userData = await prisma.user.findUnique({
    where: { id },
  });
  if (!userData) {
    throw new AppError(404, "User not found");
  }
  return userData;
};


export const UserService = {
  UpdateUserProfile,
  OwnProfileDelete,
  GetAllUsers,
  UpdateUser,
  GetSingleUser,
  DeleteUserProfile
};
