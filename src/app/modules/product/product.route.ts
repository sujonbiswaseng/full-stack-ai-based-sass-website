import { Router } from "express"
import auth from "../../middleware/Auth"
import { Role } from "../../../generated/prisma/enums"
import { multerUpload } from "../../config/multer.config"
import { validateRequest } from "../../middleware/validateRequest"
import { CreateProductSchema } from "./product.validation"
import { ProductController } from "./product.controller"
import { publicandprivateLimiter } from "../../middleware/priemiumandrouteCheck"

const router = Router()

router.use(publicandprivateLimiter)

router.post(
    "/product",
    auth([Role.ADMIN, Role.USER, Role.MANAGER]),
    multerUpload.array("files"),
    validateRequest(CreateProductSchema),
    ProductController.createProduct
  )

router.get(
    "/products",
    ProductController.getAllProducts
)
router.get(
    "/product/:productId",
    ProductController.getSingleProduct
)


export const ProductRoute=router