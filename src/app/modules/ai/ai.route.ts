import { Router } from "express";
import { geminiController } from "./ai.controller";

import { Role } from "../../../generated/prisma/enums";
import auth from "../../middleware/Auth";
import { aiLimiter } from "../../middleware/priemiumandrouteCheck";


const router=Router()
router.post("/generate-artical",auth([Role.ADMIN,Role.MANAGER,Role.USER]),aiLimiter,geminiController.generateArticle)
router.post("/generate-recommendations", auth([Role.ADMIN,Role.MANAGER,Role.USER]), aiLimiter,geminiController.generateRecommendations);
router.post("/chat-assistand", auth([Role.ADMIN,Role.MANAGER,Role.USER]),aiLimiter, geminiController.chatAssistand);
router.post("/generate-admin-analytics", auth([Role.ADMIN]),aiLimiter, geminiController.generateAdminAnalytics);


export const geminiRoute=router