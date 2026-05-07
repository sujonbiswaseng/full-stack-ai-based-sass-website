import { Router } from "express";
import { geminiController } from "./ai.controller";

import { Role } from "../../../generated/prisma/enums";
import auth from "../../middleware/Auth";
import { validateRequest } from "../../middleware/validateRequest";
import { multerUpload } from "../../config/multer.config";
import { createAiData } from "./ai.validation";

const router=Router()
router.post("/generate-artical",auth([Role.ADMIN]),geminiController.generateArticle)
router.post("/generate-recommendations", auth([Role.ADMIN]), geminiController.generateRecommendations);
router.post("/chat-assistand", auth([Role.ADMIN]), geminiController.chatAssistand);

export const geminiRoute=router