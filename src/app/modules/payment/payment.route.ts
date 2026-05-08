import { Router } from "express";
import { PaymentController } from "./payment.controller";
import auth from "../../middleware/Auth";
import { authLimiter } from "../../middleware/priemiumandrouteCheck";
import { Role } from "../../../generated/prisma/enums";

const router= Router()
router.use(authLimiter)
router.get("/payments", auth([Role.ADMIN]), PaymentController.getAllPayment);

router.patch(
    "/payments/:paymentId/status",
    auth([Role.ADMIN]),
    PaymentController.updatePaymentStatus
  );

  router.delete(
    "/payments/:paymentId",
    auth([Role.ADMIN]),
    PaymentController.deletePayment
  );
export const PaymentRouter= router