import { Router } from "express"
import { AuthController } from "./auth.controller"
import { validateRequest } from "../../middleware/validateRequest"
import { createUserSchema } from "./auth.validation"
import { Role } from "../../../generated/prisma/enums"
import auth from "../../middleware/Auth"
import { multerUpload } from "../../config/multer.config"
import { authLimiter } from "../../middleware/priemiumandrouteCheck"

const router=Router()
router.use(authLimiter);
router.post("/register",multerUpload.single("file"),validateRequest(createUserSchema), AuthController.UserRegister)
router.post("/login", AuthController.loginUser)
router.get("/me",auth([Role.ADMIN, Role.USER,Role.MANAGER]), AuthController.getMe)

router.post("/change-password", auth([Role.ADMIN, Role.USER,Role.MANAGER]), AuthController.changePassword)
router.post("/logout", auth([Role.ADMIN, Role.USER,Role.MANAGER]), AuthController.logoutUser)
router.post("/forget-password", AuthController.forgetPassword)
router.post("/reset-password", AuthController.resetPassword)
router.post("/verify-email", AuthController.verifyEmail)
router.post("/send-otp", AuthController.sendOtp)
router.get('/login/google',AuthController.googleLogin)
router.get('/google/success',AuthController.googleLoginSuccess)
router.get('/oauth/error',AuthController.handleOAuthError)
export const AuthRouters=router
