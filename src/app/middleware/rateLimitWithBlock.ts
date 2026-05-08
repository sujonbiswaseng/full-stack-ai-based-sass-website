import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { Request } from "express";
import { IRequestUser } from "../interface/requestUser.interface";


export const createLimiter = (options: {
  windowMs: number;
  freeLimit: number;
  premiumLimit?: number;
  message: string;
  premiumCheck?: (req: Request) => Promise<boolean>;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    standardHeaders: true,
    keyGenerator: (req) => ipKeyGenerator(req.ip as string),
    limit: async (req: Request) => {
      if (options.premiumCheck) {
        const isPremium = await options.premiumCheck(req);
        return isPremium
          ? options.premiumLimit || options.freeLimit
          : options.freeLimit;
      }
      return options.freeLimit;
    },
    message: options.message
  });
};