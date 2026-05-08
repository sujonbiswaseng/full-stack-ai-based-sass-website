import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";

import { Role } from "../../../generated/prisma/enums";
import auth from "../../middleware/Auth";
import { createBlogSchema, updateBlogSchema } from "./blog.validation";
import { BlogController } from "./blog.controller";
import { multerUpload } from "../../config/multer.config";
import { publicandprivateLimiter } from "../../middleware/priemiumandrouteCheck";


const router = Router();
router.use(publicandprivateLimiter)
// Routes for blog CRUD
router.post(
    "/blog",
    auth([Role.ADMIN, Role.MANAGER]), 
    multerUpload.array("files"),
    validateRequest(createBlogSchema),
    BlogController.createBlog
  )

router.get(
  "/blogs",
  BlogController.getAllBlogs
);

router.get(
  "/blog/:id",
  BlogController.getSingleBlog
);

router.put(
  "/blog/:id",
  auth([Role.ADMIN, Role.MANAGER]),
  validateRequest(updateBlogSchema),
  BlogController.updateBlog
);

router.delete(
  "/blog/:id",
  auth([Role.ADMIN]),
  BlogController.deleteBlog
);

export const BlogRouters = router;
