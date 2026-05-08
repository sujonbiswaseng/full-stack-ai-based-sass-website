import { v6 as uuidv6 } from "uuid";

import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelper/AppError";
import status from "http-status";
import { ICreateorderData } from "./order.interface";

import { parseDateForPrisma } from "../../utils/parseDate";
import { envVars } from "../../config/env";
import { stripe } from "../../config/stripe.config";
import { OrderWhereInput } from "../../../generated/prisma/models";
import { Order } from "../../../generated/prisma/client";
const CreateOrder = async (payload: ICreateorderData, email: string) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (!existingUser) throw new AppError(404, "User not found");

  if (!payload.items?.length) {
    throw new AppError(400, "Order items are required");
  }

  const buyerid = existingUser.id;

  const productids = payload.items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productids } },
  });

  if (products.length !== productids.length) {
    throw new AppError(404, "One or more product were not found");
  }

  for(const product of products){
    const sellerid=product.userId
    try {
      const result = await prisma.$transaction(async (tx) => {
        const existingOrder = await tx.order.findMany({
          where: {
            PaymentStatus: "UNPAID",
          },
        });
  
        if (existingOrder) {
          await prisma.order.deleteMany({
            where: {
              id: {
                in: existingOrder.map((item) => item.id),
              },
            },
          });
        }
  
        const existingActiveOrder = await tx.order.findMany({
          where: {
            sellerId:sellerid,
            buyerid:buyerid,
            status: { in: ['PLACED','PREPARING','READY',] },
            PaymentStatus: "PAID",
          },
          include: {
            orderitems: { include: { product: true } },
          },
        });
        const existingproductIds = existingActiveOrder.flatMap((order) =>
          order.orderitems.map((item) => item.productId),
        );
  
        const matchedMealIds = existingproductIds.filter((id) =>
          productids.includes(id),
        );
  
        if (matchedMealIds.length > 0) {
          throw new AppError(
            409,
            `Already ordered meals: ${matchedMealIds.join(", ")}`
          );
        }
  
        const totalproductPrice = payload.items.reduce((sum, item) => {
          const price = product.price
          return sum + Number(price ?? 0) * item.quantity;
        }, 0);

        const deliverycharge=product.deliveryCharge
  
        const order = await tx.order.create({
          data: {
            sellerId:sellerid,
            buyerid:buyerid,
            address: payload.address,
            phone: payload.phone,
            PaymentStatus: deliverycharge > 0 ? "UNPAID" : "PAID",
            totalPrice: totalproductPrice,
            first_name: payload.first_name ?? null,
            last_name: payload.last_name ?? null,
             orderitems: {
              createMany: {
                data: payload.items.map((item) => {
                  return {
                    productId: item.productId,
                    price: Number( product.price?? 0),
                    quantity: item.quantity,
                  };
                }),
              },
            },
          },
        });
  
        if (deliverycharge === 0) {
          return {
            order,
            payment: null,
            paymentUrl: null,
            message: "Order created successfully (no delivery charge).",
          };
        }
  
        const payment = await tx.payment.create({
          data: {
            orderid: order.id,
            amount: deliverycharge,
            transactionId: String(uuidv6()),
            status: "UNPAID",
            userId: buyerid,
            productid: payload.items[0].productId,
          },
        });
  
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "payment",
          line_items: [
            {
              price_data: {
                currency: "bdt",
                product_data: { name: "Delivery charge" },
                unit_amount: 120 * 100,
              },
              quantity: 1,
            },
          ],
          metadata: {
            orderId: order.id,
            paymentId: payment.id,
          },
          payment_intent_data: {
            metadata: {
              orderId: order.id,
              paymentId: payment.id,
            },
          },
          success_url: `${envVars.FRONTEND_URL}/payment/${order.id}?paymentId=${payment.id}`,
          cancel_url: `${envVars.FRONTEND_URL}/payment/${order.id}?paymentId=${payment.id}`,
        });
  
        return {
          order,
          payment,
          paymentUrl: session.url,
          message:
            "Order created successfully. Please complete payment from checkout URL.",
        };
      });
  
      return result;
    } catch (error) {
      console.error(error);
      if (error instanceof AppError) throw error;
      throw new AppError(500, "Failed to create order. Please try again.");
    }

  }

};


const getOwnmealsOrder = async (
  email?: string,
  data?: Record<string, any>,
  page?: number,
  limit?: number | undefined,
  skip?: number,
  sortBy?: string | undefined,
  sortOrder?: string | undefined,
  search?: string | undefined,
) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (!existingUser) {
    return {
      success: false,
      message: "User not found",
      result: null,
    };
  }

  const andConditions: OrderWhereInput[] = [];

  if (search) {
    const orConditions: any[] = [];
    orConditions.push(
      {
        first_name: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        last_name: {
          contains: search,
          mode: "insensitive",
        },
      },
    );
    if (orConditions.length > 0) {
      andConditions.push({ OR: orConditions });
    }
  }

  if (data?.status) {
    andConditions.push({
      status: {
        equals: data.status,
      },
    });
  }

  if (data?.phone) {
    andConditions.push({
      phone: data.phone,
    });
  }
  if (data?.paymentStatus) {
    andConditions.push({
      PaymentStatus: {
        equals: data.paymentStatus,
      },
    });
  }

  if (data?.totalPrice) {
    andConditions.push({
      totalPrice: {
        gte: 0,
        lte: Number(data.totalPrice),
      },
    });
  }

  if (data?.createdAt) {
    const dateRange = parseDateForPrisma(data.createdAt);
    andConditions.push({ createdAt: dateRange.gte });
  }
  if (existingUser?.role == "USER") {
    const result = await prisma.order.findMany({
      where: {
        sellerId: existingUser.id,
        AND: andConditions,
      },
      include: {
        orderitems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      message: `your own meals orders retrieve successfully`,
      result,
    };
  }
  if (existingUser?.role == "MANAGER" || existingUser.role=="ADMIN") {
    const result = await prisma.order.findMany({
      take: limit,
      skip,
      where: {
        sellerId: existingUser?.id,
        AND: andConditions,
      },
      include: {
        orderitems: {
          include: {
            product: true,
          },
        },
      },
    });

    let total = 0;
    if (existingUser?.role === "MANAGER" || existingUser.role=="ADMIN") {
      total = await prisma.order.count({
        where: {
          sellerId: existingUser.id,
          AND: andConditions,
        },
      });
    } else if (existingUser?.role === "USER") {
      total = await prisma.order.count({
        where: {
          buyerid: existingUser.id,
          AND: andConditions,
        },
      });
    }
    return {
      result,
      pagination: {
        total,
        page,
        limit,
        totalpage: Math.ceil(total / (limit || 1)) || 1,
      },
    };
  }
};

const getOwnPaymentService = async (id: string, data:Record<string,any>,email:string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, "User not found or unauthorized");
  }
  const orderres = await prisma.order.findUnique({
    where: {
      id
    },
    include: {
      payment: true
        },
  });
  if(orderres?.buyerid!==user.id){
  throw new AppError(403, "You are not authorized to view this order payment");
  }
  if(orderres?.PaymentStatus=="UNPAID"){
    throw new AppError(400,"your payment is not paid")
  }
  if(!orderres?.payment || orderres.payment.id!==data.paymentId){
    throw new AppError(404,'order payment not found')
  }
  if(!orderres){
    throw new AppError(400, "Order not found for the provided ID or payment info");
  }
  return orderres;
};

const UpdateOrderStatus = async (
  id: string,
  data: Partial<Order>,
  email: string,
) => {

  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) {
    throw new AppError(401, "User not found or unauthorized");
  }
  const role = user.role;
  const { status } = data;
  const statusValue = [
    "PLACED",
    "PREPARING",
    "READY",
    "DELIVERED",
    "CANCELLED",
  ];
  if (!statusValue.includes(status as string)) {
    throw new AppError(400, "invalid status value");
  }
  const existingOrder = await prisma.order.findUnique({ where: { id } });
  if (!existingOrder) {
    throw new AppError(404, "no order found for this id");
  }

  if (existingOrder?.status == status) {
    throw new AppError(409, `order already ${status}`);
  }
  if (role == "USER" && status !== "CANCELLED") {
    throw new AppError(400, "Customer can only change status to CANCELLED");
  }
  if (role == "USER" && status == "CANCELLED") {
    if (
      existingOrder?.status == "PLACED" ||
      existingOrder?.status == "PREPARING" ||
      existingOrder?.status == "READY"
    ) {
      throw new AppError(
        400,
        `you can't cancel order when order status is ${existingOrder.status}`,
      );
    }
    const result = await prisma.order.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });
    return result;
  }

  if (role == "MANAGER" && status === "CANCELLED") {
    throw new AppError(400, "CANCELLED only Customer Change");
  }

  if (role == "MANAGER") {
    if (
      status == "PLACED" ||
      status == "PREPARING" ||
      status == "READY" ||
      status == "DELIVERED"
    ) {
      const result = await prisma.order.update({
        where: {
          id,
        },
        data: {
          status,
        },
      });
      return {
        success: true,
        message: `update order status successfully`,
        result,
      };
    }
  }

  if (role ==="ADMIN") {
    const result = await prisma.order.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });
    return {
      success: true,
      message: `update order status successfully`,
      result,
    };
  }
};

const getAllorder = async (
  email?: string,
  data?: Record<string, any>,
  page?: number,
  limit?: number | undefined,
  skip?: number,
  sortBy?: string | undefined,
  sortOrder?: string | undefined,
  search?: string | undefined,
) => {
  if (!email) {
    throw new AppError(401, "Email is required");
  }
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) {
    throw new AppError(404, "User not found");
  }
  const role = user.role;
  if (role !== "ADMIN") {
    throw new AppError(403, "View all orders is only allowed for Admin users.");
  }

  const andConditions: OrderWhereInput[] = [];

  if (search) {
    const orConditions: any[] = [];
    orConditions.push(
      {
        first_name: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        last_name: {
          contains: search,
          mode: "insensitive",
        },
      },
    );
    if (orConditions.length > 0) {
      andConditions.push({ OR: orConditions });
    }
  }

  if (data?.status) {
    andConditions.push({
      status: {
        equals: data.status,
      },
    });
  }

  if (data?.phone) {
    andConditions.push({
      phone: data.phone,
    });
  }
  if (data?.paymentStatus) {
    andConditions.push({
      PaymentStatus: {
        equals: data.paymentStatus,
      },
    });
  }

  if (data?.totalPrice) {
    andConditions.push({
      totalPrice: {
        gte: 0,
        lte: Number(data.totalPrice),
      },
    });
  }

  if (data?.createdAt) {
    const dateRange = parseDateForPrisma(data.createdAt);
    andConditions.push({ createdAt: dateRange.gte });
  }
  const result = await prisma.order.findMany({
    where: {
      AND: andConditions,
    },
    include: {
      orderitems: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  const total = await prisma.order.count({
    where: {
      AND: andConditions,
    },
  });
  return {
    result,
    pagination: {
      total,
      page,
      limit,
      totalpage: Math.ceil(total / (limit || 1)) || 1,
    },
  };
};

const customerOrderStatusTrack = async (productid: string, userid: string) => {
  const existingOrder = await prisma.order.findMany({
    where: {
      buyerid: userid,
      orderitems: {
        some: {
          productId: productid,
        },
      },
    },
  });
  if (existingOrder.length === 0) {
    throw new AppError(status.NOT_FOUND, "no order found for this meal");
  }

  // const result = await prisma.order.findMany({
  //     include: {
  //         orderitem: {
  //             where: {
  //                 mealId: mealid
  //             },
  //             select: {
  //                 mealId: true,
  //                 price: true,
  //                 quantity: true
  //             },
  //             orderBy: {
  //                 createdAt: 'desc'
  //             }
  //         },

  //     },
  //     orderBy: {
  //         createdAt: 'desc'
  //     }
  // })
  return {
    success: true,
    message: `customer order status track successfully`,
    result: existingOrder,
  };
};

const CustomerRunningAndOldOrder = async (userid: string, status: string) => {
  const andConditions: any[] = [];
  let message = "customer running and old order retrieve successfully";
  let currentStatus = status;
  if (status == "DELIVERED") {
    andConditions.push({ status: status });
    ((message = "Recent order information retrieved successfully."),
      (currentStatus = status));
  }
  if (status == "CANCELLED") {
    andConditions.push({ status: status });
    ((message = "CANCELLED order information retrieved successfully."),
      (currentStatus = status));
  }

  if (status == "PLACED" || status == "PREPARING" || status == "READY") {
    andConditions.push({ status: status });
    ((message = "running order retrieved successfully."),
      (currentStatus = status));
  }
  const result = await prisma.order.findMany({
    where: {
      buyerid: userid,
      AND: andConditions,
    },
    include: {
      orderitems:true
    },
  });

  return {
    success: true,
    message,
    result,
  };
};

const getSingleOrder = async (id: string) => {
  const result = await prisma.order.findUnique({
    where: { id },
    include: {
      orderitems: {
        select: {
          productId: true,
          orderId: true,
          price: true,
          quantity: true,
        },
      },
    },
  });
  if (!result) {
    throw new AppError(status.NOT_FOUND, "no order found for this id");
  }
  return {
    success: true,
    message: `single order retrieve successfully`,
    result,
  };
};

const deleteOrder = async (id: string, role: string) => {
  const existingOrder = await prisma.order.findUnique({
    where: { id },
  });

  if (!existingOrder) {
    throw new AppError(status.NOT_FOUND, "Order not found");
  }
  const deletedOrder = await prisma.order.delete({
    where: { id },
  });

  return {
    success: true,
    message: "Order deleted successfully",
    result: deletedOrder,
  };
};

export const ServiceOrder = {
  CreateOrder,
  getOwnmealsOrder,
  UpdateOrderStatus,
  getAllorder,
  customerOrderStatusTrack,
  CustomerRunningAndOldOrder,
  getSingleOrder,
  getOwnPaymentService,
  deleteOrder,
};
