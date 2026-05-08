import { Router } from "express";
import {  OrderController } from "./order.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { CreateorderData } from "./order.validation";
import { authLimiter } from "../../middleware/priemiumandrouteCheck";
import auth from "../../middleware/Auth";
import { Role } from "../../../generated/prisma/enums";

const router = Router()
router.use(authLimiter)
router.post('/orders', auth([Role.USER]), validateRequest(CreateorderData), OrderController.createOrder)
router.get('/orders/meal/:id/status', auth([Role.USER]), OrderController.customerOrderStatusTrack)
router.get('/myorders/status', auth([Role.USER]), OrderController.CustomerRunningAndOldOrder)
router.get('/orders/all', auth([Role.ADMIN]), OrderController.getAllOrder)
router.get('/orders', auth([Role.ADMIN,Role.MANAGER,Role.ADMIN]), OrderController.getOwnmealsOrder)
router.patch('/provider/orders/:id', auth([Role.ADMIN,Role.MANAGER,Role.USER]), OrderController.UpdateOrderStatus)
router.get('/orders/:id', auth([Role.USER]), OrderController.getSingleOrder)
router.delete('/order/:id', auth([Role.USER]), OrderController.deleteOrder)
router.get("/order/:id/own-payment",auth([Role.USER]),OrderController.getOwnPayment)

export const OrderRouter = { router }