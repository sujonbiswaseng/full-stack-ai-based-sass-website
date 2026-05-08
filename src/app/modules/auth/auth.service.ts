import { UserStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelper/AppError";
import { IRequestUser } from "../../interface/requestUser.interface";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/pino";
import { tokenUtils } from "../../utils/token";
import {
  IChangePasswordPayload,
  ILoginUser,
  UserCreateInput,
} from "./auth.interface";
import status from "http-status";
const UserRegister = async (payload: UserCreateInput) => {
  const { name, email, password, phone, image } = payload;
  const userExist = await prisma.user.findUnique({
    where: { email: email },
  });
  if(!image){
    throw new AppError(status.BAD_REQUEST, "Image is required to register a user.");
  }
  
  if (userExist) {
    throw new AppError(409, "user already exist,please try another email");
  }
  const data = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
      phone,
      image,
    },
  });
  logger.debug({ userId: data?.user?.id }, "User registration response received");
  if (!data.user) {
    throw new AppError(400, "User register failed");
  }

  const accessToken = tokenUtils.getAccessToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });

  const refreshToken = tokenUtils.getRefreshToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });

  return {
    ...data,
    token: data.token,
    accessToken,
    refreshToken,
  };
};

const loginUser = async (payload: ILoginUser) => {
  const { email, password } = payload;

  const data = await auth.api.signInEmail({
    body: {
      email,
      password,
    },
  });
  if (data.user.status === UserStatus.BLOCKED) {
    throw new AppError(status.FORBIDDEN, "User is blocked");
  }

  if (data.user.isDeleted || data.user.status === UserStatus.DELETED) {
    throw new AppError(status.NOT_FOUND, "User is deleted");
  }

  const accessToken = tokenUtils.getAccessToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });

  const refreshToken = tokenUtils.getRefreshToken({
    userId: data.user.id,
    role: data.user.role,
    name: data.user.name,
    email: data.user.email,
    status: data.user.status,
    isDeleted: data.user.isDeleted,
    emailVerified: data.user.emailVerified,
  });
  return {
    ...data,
    accessToken,
    refreshToken,
  };
};

const getMe = async (user: IRequestUser) => {
  if (!user?.userId) {
    throw new AppError(status.UNAUTHORIZED, "Unauthorized access. Please login first.");
  }

  const isUserExists = await prisma.user.findUnique({
    where: {
      id: user.userId,
    },
    include: {
      products: {
        include: {
          reviews: true,
        },
      },
    },
  });
  if (!isUserExists) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  const userid = isUserExists.id;
  const ratings = await prisma.review.groupBy({
    by: ["productid"],
    where: {
      userid: userid,
      rating: {
        gt: 0,
      },
    },
    _avg: {
      rating: true,
    },
    _count: {
      rating: true,
    },
  });

  const totalReview = ratings.reduce((sum, r) => sum + r._count.rating, 0);

  const totalRating = ratings.reduce(
    (sum, r) => sum + (r._avg.rating ?? 0) * r._count.rating,
    0,
  );
  const averageRating = totalReview > 0 ? totalRating / totalReview : 0;
  return {
    ...isUserExists,
    totalReview: totalReview || 0,
    averageRating: Number(averageRating.toFixed(1)) || 0,
  };
};

const changePassword = async (
  payload: IChangePasswordPayload,
  sessionToken: string,
) => {
  const session = await auth.api.getSession({
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });

  if (!session) {
    throw new AppError(status.UNAUTHORIZED, "Invalid session token");
  }

  const { currentPassword, newPassword } = payload;

  const result = await auth.api.changePassword({
    body: {
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    },
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });
  if(!result){
    throw new AppError(400,'user change password failed')
  }

  const accessToken = tokenUtils.getAccessToken({
    userId: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
    status: session.user.status,
    isDeleted: session.user.isDeleted,
    emailVerified: session.user.emailVerified,
  });

  const refreshToken = tokenUtils.getRefreshToken({
    userId: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
    status: session.user.status,
    isDeleted: session.user.isDeleted,
    emailVerified: session.user.emailVerified,
  });

  return {
    ...result,
    accessToken,
    refreshToken,
  };
};

const logoutUser = async (sessionToken: string) => {
  const result = await auth.api.signOut({
    headers: new Headers({
      Authorization: `Bearer ${sessionToken}`,
    }),
  });

  return result;
};

const forgetPassword = async (email: string) => {
  const isUserExist = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!isUserExist) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }
  if (isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  await auth.api.requestPasswordResetEmailOTP({
    body: {
      email,
    },
  });
};

const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
) => {
  logger.debug({ email }, "Password reset requested");
  const isUserExist = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!isUserExist) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }


  if (isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  await auth.api.resetPasswordEmailOTP({
    body: {
      email,
      otp,
      password: newPassword,
    },
  });
  await prisma.session.deleteMany({
    where: {
      userId: isUserExist.id,
    },
  });
};

const verifyEmail = async (email: string, otp: string) => {
  const result = await auth.api.verifyEmailOTP({
    body: {
      email,
      otp,
    },
  });

  if (result.status && !result.user.emailVerified) {
    await prisma.user.update({
      where: {
        email,
      },
      data: {
        emailVerified: true,
      },
    });
  }
};

const sendOtp = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (user.isDeleted || user.status === UserStatus.DELETED) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }
  if (user.emailVerified) {
    throw new AppError(status.BAD_REQUEST, "Email already verified");
  }

  // Send OTP using external auth API
  const result =await auth.api.sendVerificationOTP({
    body: {
      email: email, // required
      type: "email-verification", // required
  }, 
  });

  return result;
};


const googleLoginSuccess = async (session: Record<string, any>) => {
  const isPatientExists = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if (!isPatientExists) {
    await prisma.user.create({
      data: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image:""
      },
    });
  }
  const accessToken = tokenUtils.getAccessToken({
    userId: session?.user.id,
    role: session?.user.role,
    name: session?.user.name,
  });
  const refreshToken = tokenUtils.getRefreshToken({
    userId: session?.user.id,
    role: session?.user.role,
    name: session?.user.name,
  });
  return {
    accessToken,
    refreshToken,
  };
};

export const AuthService = {
  UserRegister,
  loginUser,
  getMe,
  changePassword,
  logoutUser,
  forgetPassword,
  resetPassword,
  verifyEmail,
  googleLoginSuccess,
  sendOtp
};
