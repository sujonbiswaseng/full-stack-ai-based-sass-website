import { NextFunction, Request, RequestHandler, Response } from "express";
import { logger } from "../lib/pino";

export const catchAsync = (fn: RequestHandler) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await fn(req, res, next);
        } catch (error: any) {
            logger.error({ error }, "Unhandled error in catchAsync");
            res.status(500).json({
                success: false,
                message: error.message||'Failed to fetch',
                error: error.message
            });
        }
    }
}