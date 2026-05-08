import Stripe from "stripe";
import { prisma } from "../../lib/prisma";
import { parseDateForPrisma } from "../../utils/parseDate";
import AppError from "../../errorHelper/AppError";
import { PaymentStatus } from "../../../generated/prisma/enums";


const deleteorderAndPayment = async (
  orderid?: string,
  paymentId?: string,
) => {
  if (!orderid || !paymentId) {
    console.error("Missing participantId or paymentId in session metadata");
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.deleteMany({
      where: { id: paymentId },
    });

    await tx.order.deleteMany({
      where: { id: orderid },
    });
  });

  console.log(
    `Payment failed. Deleted order ${orderid} and payment ${paymentId}`,
  );
};

const cleanupAllUnpaidPayments = async () => {
  const unpaidPayments = await prisma.payment.findMany({
    where: { status: PaymentStatus.UNPAID },
    select: { id: true, orderid: true },
  });

  if (!unpaidPayments.length) {
    return { deletedPayments: 0, deletedParticipants: 0 };
  }

  const paymentIds = unpaidPayments.map((p) => p.id);
  const orderIds = unpaidPayments.map((p) => p.orderid);

  const [deletedPayments, deletedParticipants] = await prisma.$transaction([
    prisma.payment.deleteMany({
      where: { id: { in: paymentIds } },
    }),
    prisma.order.deleteMany({
      where: { id: { in: orderIds } },
    }),
  ]);

  return {
    deletedPayments: deletedPayments.count,
    deletedParticipants: deletedParticipants.count,
  };
};

const handlerStripeWebhookEvent = async (event: Stripe.Event) => {
  const existingPayment = await prisma.payment.findFirst({
    where: {
      stripeEventId: event.id,
    },
  });
  if (existingPayment) {
    console.log(`Event ${event.id} already processed. Skipping`);
    return { message: `Event ${event.id} already processed. Skipping` };
  }
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orderId = session.metadata?.orderid;
      const paymentId = session.metadata?.paymentId;

      if (!orderId || !paymentId) {
        console.error("Missing orderid or paymentId in session metadata");
        return {
          message: "Missing orderid or paymentId in session metadata",
        };
      }

      const order = await prisma.order.findUnique({
        where: {
          id: orderId,
        },
      });
      if (!order) {
        console.error(`order with id ${orderId} not found`);
        return { message: `order with id ${orderId} not found` };
      }

      if (session.payment_status !== "paid") {
        await deleteorderAndPayment(orderId, paymentId);
        await cleanupAllUnpaidPayments()
        break;
      }

      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: {
            id: orderId,
          },
          data: {
            PaymentStatus: PaymentStatus.PAID,
          },
        });

        await tx.payment.update({
          where: {
            id: paymentId,
          },
          data: {
            stripeEventId: event.id,
            status: PaymentStatus.PAID,
            paymentGatewayData: session as any,
          },
        });
      });

      console.log(
        `Processed checkout.session.completed for order ${orderId} and payment ${paymentId}`,
      );
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      const paymentId = session.metadata?.paymentId;
      await deleteorderAndPayment(orderId, paymentId);
      await cleanupAllUnpaidPayments()
      break;
    }

    case "payment_intent.succeeded": {
      const session = event.data.object;
      console.log(
        `Payment intent ${session.id} succeeded.`,
      );
      break;
    }
    case "payment_intent.payment_failed": {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      const paymentId = session.metadata?.paymentId;
      await deleteorderAndPayment(orderId, paymentId);
      await cleanupAllUnpaidPayments()
      break;
    }
    case "checkout.session.async_payment_failed":{
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      const paymentId = session.metadata?.paymentId;
      await deleteorderAndPayment(orderId, paymentId);
      await cleanupAllUnpaidPayments()
      break;
    }
    case "payment_intent.canceled":{
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      const paymentId = session.metadata?.paymentId;

      await deleteorderAndPayment(orderId, paymentId);
      await cleanupAllUnpaidPayments()
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  return {message : `Webhook Event ${event.id} processed successfully`}
};






const getAllPaymentsService = async (
  email: string,
  page: number,
  limit: number,
  skip: number,
  sortBy: string,
  sortOrder: string,
  query: any
) => {
  await cleanupAllUnpaidPayments();
  
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("User not found");
  if (user.role !== "ADMIN") {
    throw new Error("Unauthorized: Only admin can access all payments");
  }
  const filters: any[] = [];
  if (query.status) filters.push({ status: query.status });
  if (query.amount) filters.push({ amount: Number(query.amount) });
  if (query.paymentStatus) filters.push({ status: query.paymentStatus });
  if (query.createdAt) {
    const dateRange = parseDateForPrisma(query.createdAt);
    filters.push({ createdAt: dateRange });
  }
  if (query.userId) filters.push({ userId: query.userId });
  if (query.eventId) filters.push({ eventId: query.eventId });

  const whereOptions = filters.length ? { AND: filters } : {};;


  // Only admin can view all payments
  const payments = await prisma.payment.findMany({
    where: whereOptions,
    skip,
    take: limit,
    orderBy: {"createdAt":"desc" },
    include:{
      product:true,
      order:true,
      user:true
    },
  });
  const total = await prisma.payment.count({ where: whereOptions });
  return {
    payments,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const updatePaymentStatusWithOrderCheck = async (
  paymentId: string,
  newStatus: string
) => {
  // Find the payment
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { product: true }
  });
  if (!payment) {
    throw new AppError(404,"Payment not found");
  }

  // Check the participant and payment status logic
  if (!payment.product) {
    throw new AppError(404,"Associated product not found");
  }

  // If status is UNPAID, remove both payment and participant.
  if (newStatus.toUpperCase() === PaymentStatus.UNPAID) {
    const [deletedPayment, deletedParticipant] = await prisma.$transaction([
      prisma.payment.delete({
        where: { id: paymentId },
      }),
      prisma.order.delete({
        where: { id: payment.orderid },
      }),
    ]);

    return {
      payment: deletedPayment,
      participant: deletedParticipant,
      message: "Payment is UNPAID, so payment and order were deleted",
    };
  }



  const [updatedPayment, updatedOrder] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: { status: newStatus as any }
    }),
    prisma.order.update({
      where: { id: payment.orderid},
      data: { PaymentStatus: newStatus as any }
    })
  ]);


  return {
    payment: updatedPayment,
    order: updatedOrder
  };
};


const deletePayment = async (paymentId: string) => {
  // Find the payment
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true }
  });
  if (!payment) {
    throw new Error("Payment not found");
  }

  // Check if participant is associated
  if (!payment.order) {
    throw new Error("Associated participant not found");
  }

  const [deletedPayment, deletedOrder] = await prisma.$transaction([
    prisma.payment.delete({
      where: { id: paymentId }
    }),
    prisma.order.delete({
      where: { id: payment.order.id },
    })
  ]);

  return {
    payment: deletedPayment,
    order: deletedOrder
  };
};




export const PaymentService = {
  handlerStripeWebhookEvent,
  getAllPaymentsService,
  updatePaymentStatusWithOrderCheck,
  deletePayment
};