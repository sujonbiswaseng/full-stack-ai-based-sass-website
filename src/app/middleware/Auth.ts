import { NextFunction, Request, Response } from "express";
import { auth as betterAuthInstance } from "../lib/auth"; 
import status from "http-status";
import AppError from "../errorHelper/AppError";
import { CookieUtils } from "../utils/cookie";
import { prisma } from "../lib/prisma";
import { Role } from "../../generated/prisma/enums";
import { jwtUtils } from "../utils/jwt";
import { logger } from "../lib/pino";

const auth = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionToken = CookieUtils.getCookie(req, "better-auth.session_token");
      const accessToken = CookieUtils.getCookie(req, "accessToken");
      let isAuthenticated = false;
      if (sessionToken) {
        const betterSession = await betterAuthInstance.api.getSession({ headers: req.headers as HeadersInit});
        
        if (betterSession && betterSession.session) {
          const sessionExists = await prisma.session.findFirst({
            where: {
              token: betterSession.session.token,
              expiresAt: { gt: new Date() },
            },
            include: { user: true },
          });

          if (sessionExists && sessionExists.user) {
            const user = sessionExists.user;
            const now = new Date();
            const expiresAt = new Date(sessionExists.expiresAt);
            const createdAt = new Date(sessionExists.createdAt);
            const sessionLifeTime = expiresAt.getTime() - createdAt.getTime();
            const timeRemaining = expiresAt.getTime() - now.getTime();
            const percentRemaining = (timeRemaining / sessionLifeTime) * 100;

            if (percentRemaining < 20) {
              res.setHeader("X-Session-Refresh", "true");
              res.setHeader("X-Session-Expires-At", expiresAt.toISOString());
            }

            if (user.status === "BLOCKED" || user.status === "DELETED") {
              throw new AppError(status.UNAUTHORIZED, "Unauthorized access! User is not active.");
            }

            if (roles.length > 0 && !roles.includes(user.role as Role)) {
              throw new AppError(status.FORBIDDEN, "Forbidden access! No permission.");
            }
            req.user = { userId: user.id, role: user.role, email: user.email };
            isAuthenticated = true;
          }
        }
      }

      if (!isAuthenticated && accessToken) {
        const verifiedToken = jwtUtils.verifyToken(
          accessToken,
          process.env.ACCESS_TOKEN_SECRET as string,
        );

        if (verifiedToken.success && verifiedToken.data) {
          const userData = verifiedToken.data;
          console.log(userData,'userdata')
          logger.info(`Decoded user data from access token ${userData}`);
     

          if (roles.length > 0 && !roles.includes(userData.role as Role)) {
            throw new AppError(status.FORBIDDEN, "Forbidden access! No permission.");
          }

          req.user = {
            userId: userData.userId,
            role: userData.role,
            email: userData.email,
          };
          isAuthenticated = true;
        }
      }

      if (!isAuthenticated) {
        throw new AppError(status.UNAUTHORIZED, "Unauthorized access! No valid session or token.");
      }

      next();

    } catch (error: any) {
      throw new AppError(error.statusCode || status.BAD_REQUEST, error.message);
    }
  };
};

export default auth;