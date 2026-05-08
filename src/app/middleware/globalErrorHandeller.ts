import status from "http-status";
import AppError from "../errorHelper/AppError";
import { NextFunction, Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client";
import { TErrorSources } from "../interface/error.interface";
import { sendResponse } from "../shared/sendResponse";
import { handleZodError } from "../errorHelper/handleerror";
import z from "zod";
import { deleteFileFromCloudinary } from "../config/cloudinary.config";
import multer from "multer";
import { logger } from "../lib/pino";

function errorHandler (err: any, req: Request, res: Response, next: NextFunction) {
    let statusCode: number = status.INTERNAL_SERVER_ERROR; // Default 500
    let message: string = 'Internal Server Error';
    let errorSources: TErrorSources[] = [];
    let stack: string | undefined = undefined;
    logger.error({
        message: err.message,
        url: req.url,
        method: req.method,
        ip: req.ip,
        stack: err.stack
      });
    if (err instanceof multer.MulterError) {
        logger.warn("Multer file upload error");
        return res.status(400).json({
            success: false,
            message: err.code === 'LIMIT_FILE_SIZE' ? "ফাইলটি অনেক বড়! ১ মেগাবাইটের বেশি ফাইল আপলোড করা যাবে না।" : err.message,
            httpStatusCode: 400,
            data: { errorSources: [{ path: 'file', message: err.message }] }
        });
    }

    // Prisma Validation Error
    if (err instanceof Prisma.PrismaClientValidationError) {
        logger.warn("Prisma validation error");
        statusCode = status.BAD_REQUEST;
        message = "Validation Error";
        errorSources.push({ message: err.message });
    }    
    else if (err instanceof AppError) {
        statusCode = err.statusCode || status.BAD_REQUEST;
        message = err.message;
        errorSources.push({ message: err.message });
        logger.warn(`AppError: ${err.message}`);
    }
    else if (err instanceof z.ZodError) {
        const simplifiedError = handleZodError(err);
        statusCode = simplifiedError.statusCode as number
        message = simplifiedError.message
        errorSources = [...simplifiedError.errorSources]
        stack = err.stack;
        logger.warn("Zod validation error");

    }
    if (req.file && req.file.path) {
            if (req.file?.path) {
                deleteFileFromCloudinary(req.file.path);
            }
            logger.info("Uploaded file deleted from cloudinary due to error");
    }
    sendResponse(res,{
        success:false,
        message:message,
        httpStatusCode:statusCode,
        data:{errorSources,stack:process.env.NODE_ENV==='development'?err.stack:stack}
    })
}

export default errorHandler;