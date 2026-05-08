import { Router } from "express";
import { CategoryController } from "./category.controller";

import { validateRequest } from "../../middleware/validateRequest";
import { createcategoryData, UpdatecategoryData } from "./category.validation";
import { multerUpload } from "../../config/multer.config";
import auth from "../../middleware/Auth";
import { Role } from "../../../generated/prisma/enums";
import { publicandprivateLimiter } from "../../middleware/priemiumandrouteCheck";

const router=Router()
router.use(publicandprivateLimiter)
router.post("/category",auth([Role.ADMIN,Role.MANAGER]),multerUpload.single("file"),validateRequest(createcategoryData),CategoryController.CreateCategory)
router.get("/category",CategoryController.getCategory)
router.get("/category/:id",CategoryController.SingleCategory)
router.put("/admin/category/:id",auth([Role.ADMIN]),validateRequest(UpdatecategoryData),CategoryController.UpdateCategory)
router.delete("/admin/category/:id",auth([Role.ADMIN]),CategoryController.DeleteCategory)

export const CategoryRouter={router}