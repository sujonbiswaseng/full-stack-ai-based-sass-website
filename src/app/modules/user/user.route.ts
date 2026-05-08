import { Router } from "express"
import { Role } from "../../../generated/prisma/enums"
import auth from "../../middleware/Auth";
import { UserController } from "./user.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { UpdateUserCommonData, UpdateuserProfileData } from "./user.validation";
import { publicandprivateLimiter } from "../../middleware/priemiumandrouteCheck";

const router=Router()
router.use(publicandprivateLimiter)
router.get("/admin/users",auth([Role.ADMIN,Role.MANAGER]),UserController.GetAllUsers)
router.delete("/profile/own",auth([Role.USER]),UserController.OwnProfileDelete)
router.get(
  "/profile/:id",
  UserController.GetSingleUser
);



router.put(
  "/profile/update",
  auth([Role.USER, Role.ADMIN,Role.MANAGER]),
  validateRequest(UpdateuserProfileData),
  UserController.UpdateUserProfile
);

router.put("/admin/profile/:id",auth([Role.ADMIN,Role.MANAGER]),validateRequest(UpdateUserCommonData),UserController.UpdateUser)

router.delete("/profile/own/delete",auth([Role.USER,Role.ADMIN,Role.MANAGER]),UserController.OwnProfileDelete)

router.delete("/admin/profile/:id",auth([Role.ADMIN]),UserController.DeleteUserProfile)
export const UsersRoutes = router;
