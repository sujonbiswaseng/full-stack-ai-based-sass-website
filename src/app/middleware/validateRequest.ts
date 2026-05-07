import { NextFunction, Request, Response } from "express";
import z from "zod";

export const validateRequest = (zodSchema: z.ZodObject) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.body?.data) {
            try {
                req.body = JSON.parse(req.body.data);
            } catch (e) {
                return next(new Error("Invalid JSON in 'data' field"));
            }
        }
        const parsedResult = zodSchema.safeParse(req.body);


        if (!parsedResult.success) {
            return next(parsedResult.error);
        }
        req.body = parsedResult.data;
        next();
    }
}