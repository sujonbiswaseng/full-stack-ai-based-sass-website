import { Router } from "express";
import { AuthRouters } from "../modules/auth/auth.route";
import { UsersRoutes } from "../modules/user/user.route";

import { BlogRouters } from "../modules/blog/blog.route";
import { HighlightRouters } from "../modules/highlight/highlight.route";
import { NewsletterRouters } from "../modules/newsletter/newsletter.route";
import { CategoryRouter } from "../modules/category/category.route";

const router = Router()
router.use("/v1", BlogRouters);
router.use("/v1", HighlightRouters);

router.use("/v1", NewsletterRouters);

router.use("/v1/auth", AuthRouters);
router.use("/v1", CategoryRouter.router);

router.use("/v1", UsersRoutes);

export const IndexRouter=router