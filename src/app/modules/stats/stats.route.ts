import express from "express";
import { StatsController } from "./stats.controller";
import auth from "../../middleware/Auth";
import { Role } from "../../../generated/prisma/enums";


const router = express.Router();

router.get(
  "/stats",
  auth([Role.ADMIN,Role.MANAGER]),
  StatsController.getDashboardStatsData
);

router.get(
  '/publicstats',StatsController.getPublicStatsData
)

export const StatsRoutes = router;