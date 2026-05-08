import { seedAdmin } from './../../scripts/seedAdmin';
import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";

import { Role } from "../../../generated/prisma/enums";
import auth from "../../middleware/Auth";
import { createHighlightSchema, updateHighlightSchema } from "./highlight.validation";
import { HighlightController } from "./highlight.controller";
import { multerUpload } from "../../config/multer.config";
import { publicandprivateLimiter } from '../../middleware/priemiumandrouteCheck';

const router = Router();
router.use(publicandprivateLimiter)

// Routes for highlight CRUD
router.post(
  "/highlight",
  auth([Role.ADMIN, Role.MANAGER]),
  multerUpload.single("file"),
  validateRequest(createHighlightSchema),
  HighlightController.createHighlight
);

router.get(
  "/highlights",
  HighlightController.getAllHighlights
);

router.get(
  "/highlight/:id",
  HighlightController.getSingleHighlight
);

router.put(
  "/highlight/:id",
  auth([Role.ADMIN, Role.MANAGER]),
  validateRequest(updateHighlightSchema),
  HighlightController.updateHighlight
);

router.delete(
  "/highlight/:id",
  auth([Role.ADMIN]),
  HighlightController.deleteHighlight
);

export const HighlightRouters = router;
