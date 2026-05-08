import status from "http-status";
import AppError from "../../errorHelper/AppError";
import { IRequestUser } from "../../interface/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { PaymentStatus, Role } from "../../../generated/prisma/enums";
import { logger } from "../../lib/pino";

const getDashboardStatsData = async (user: IRequestUser) => {
  // Check if user exists (based on userId)
  const userExists = await prisma.user.findUnique({
    where: { email: user.email }
  });

  if (!userExists) {
    throw new AppError(status.NOT_FOUND, "User does not exist");
  }
  let statsData;
  switch (user.role) {
    case Role.ADMIN:
      statsData = getAdminDashboardStats();
      break;
    case Role.MANAGER:
      statsData = getManagerDashboardStats(userExists.id);
      break;
    default:
      throw new AppError(status.BAD_REQUEST, "Invalid user role");
  }

  return statsData;
};
interface IBarChartData {
  month: string;
  revenue: number;
}

export const getAdminDashboardStats = async () => {
  try {
    const [totalproduct,totaluser,totalorder,totalReviews,totalpayment] = await prisma.$transaction([
      prisma.product.count(),
      prisma.user.count(),
      prisma.order.count(),
      prisma.review.count(),
      prisma.payment.count(),
    ]);

    const [cancelledorder, deliveredorder, placedorder, preparingorder, readyorder] = await Promise.all([
      prisma.order.count({ where: { status: "CANCELLED" } }),
      prisma.order.count({ where: { status: "DELIVERED" } }),
      prisma.order.count({ where: { status: "PLACED" } }),
      prisma.order.count({ where: { status: "PREPARING" } }),
      prisma.order.count({ where: { status: "READY" } }),
    ]);

    const revenueResult = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: PaymentStatus.PAID },
    });
    const totalRevenue = revenueResult._sum.amount ?? 0;

    const payments = await prisma.payment.findMany({
      where: { status: PaymentStatus.PAID },
      select: { amount: true, createdAt: true },
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyRevenue: Record<number, number> = {};

    payments.forEach(payment => {
      const month = payment.createdAt.getMonth();
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + Number(payment.amount);
    });

    const barChartData: IBarChartData[] = monthNames.map((month, idx) => ({
      month,
      revenue: monthlyRevenue[idx] ?? 0,
    }));
    return {
      counts:{
        totalproduct,
        totalorder,
        totalReviews,
        totalpayment,totaluser
      },
      totalRevenue,
      monthlyRevenue: barChartData,
      order: {
        cancelledorder,
        deliveredorder,
        placedorder,
        preparingorder,
        readyorder,
      },

    };
  } catch (error) {
    logger.error("Failed to fetch admin dashboard stats:");
    throw new AppError(400,"Could not fetch dashboard stats");
  }
};

interface IBarChartData {
  month: string;
  revenue: number;
}

export const getManagerDashboardStats = async (userId: string) => {
  try {
    const provider = await prisma.user.findUnique({
      where: { id:userId },
      select: { id: true }
    });

    if (!provider) {
      throw new Error("Provider not found");
    }
    const counts = await prisma.$transaction([
      prisma.product.count({
        where: { userId:userId}
      }),
      prisma.order.count({
        where: { sellerId: userId }
      }),
    ]);
    const [mealsCount, orderCount] = counts;

    const [cancelledorder, deliveredorder, placedorder, preparingorder, readyorder] = await Promise.all([
      prisma.order.count({ where: { sellerId: userId , status: "CANCELLED" } }),
      prisma.order.count({ where: { sellerId:  userId , status: "DELIVERED" } }),
      prisma.order.count({ where: { sellerId: userId , status: "PLACED" } }),
      prisma.order.count({ where: { sellerId:  userId , status: "PREPARING" } }),
      prisma.order.count({ where: { sellerId:  userId , status: "READY" } }),
    ]);
    const managerOrders = await prisma.order.findMany({
      where: {
        sellerId:  userId 
      },
      select: { id: true }
    });
    const orderIds = managerOrders.map(order => order.id);

    let totalRevenue = 0;
    let barChartData: IBarChartData[] = [];
    if (orderIds.length > 0) {
      // Get sum
      const revenueResult = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          orderid: { in: orderIds },
          status: PaymentStatus.PAID
        }
      });
      totalRevenue = revenueResult._sum.amount ?? 0;
      const payments = await prisma.payment.findMany({
        where: {
          orderid: { in: orderIds },
          status: PaymentStatus.PAID
        },
        select: { amount: true, createdAt: true },
      });

      // Prepare chart data
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthlyRevenue: Record<number, number> = {};
      payments.forEach(payment => {
        const month = payment.createdAt.getMonth();
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + Number(payment.amount);
      });

      barChartData = monthNames.map((month, idx) => ({
        month,
        revenue: monthlyRevenue[idx] ?? 0,
      }));
    } else {
      // No orders, empty chart
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      barChartData = monthNames.map(month => ({ month, revenue: 0 }));
    }

    return {
      counts: {
        mealsCount: mealsCount,
        orderCount,
      },
      totalRevenue,
      monthlyRevenue: barChartData,
      order: {
        cancelledorder,
        deliveredorder,
        placedorder,
        preparingorder,
        readyorder,
      }
    };
  } catch (error) {
    console.error("Failed to fetch provider dashboard stats:", error);
    throw new Error("Could not fetch provider dashboard stats");
  }
};


export const getPublicStatsData = async () => {
  try {
    // Total Events
    const totalmeals = await prisma.product.count();

    // Total Users
    const totalUsers = await prisma.user.count();
    const totalCustomer= await prisma.user.count({
      where: { role: "USER" },
    });

    // Total Managers (role: Manger)
    const totalprovider = await prisma.user.count({
      where: { role: "MANAGER" },
    });

    // Total Admins (role: ADMIN)
    const totalAdmins = await prisma.user.count({
      where: { role: "ADMIN" },
    });

    // Total orders (number of unique orders)
    const totalorders = await prisma.order.count();
    const totalcategory = await prisma.category.count();

    // Total Reviews
    const totalReviews = (await prisma.review?.count?.({where:{status:"APPROVED",parentId:null}})) ?? 0;

    // Total Newsletters
    const totalNewsletters = (await prisma.newsletter?.count?.()) ?? 0;

    return {
      totalmeals,
      totalUsers,
      totalCustomer,
      totalprovider,
      totalAdmins,
      totalorders,
      totalcategory,
      totalReviews,
      totalNewsletters,
    };
  } catch (error) {
    console.error("Failed to fetch public stats:", error);
    throw new Error("Could not fetch public stats");
  }
};

export const statsService = { getDashboardStatsData ,getPublicStatsData};