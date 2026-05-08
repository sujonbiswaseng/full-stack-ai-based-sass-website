import express, { Application, Request, Response } from "express";

import { notFound } from "./app/middleware/notFound";
import cookieParser from 'cookie-parser';
import { toNodeHandler } from "better-auth/node";
import { auth } from "./app/lib/auth";
import path from "path";
import cors from 'cors'
import errorHandler from "./app/middleware/globalErrorHandeller";
import { IndexRouter } from "./app/routes";
import { envVars } from "./app/config/env";
const app: Application = express();
app.use('/api/auth',toNodeHandler(auth))
app.set("view engine", "ejs");
app.set("views",path.resolve(process.cwd(), `src/app/templates`) )


app.use(cookieParser());
app.use(cors({
  origin:envVars.FRONTEND_URL|| "http://localhost:3000",
  credentials: true
}));
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());



app.use("/api",IndexRouter);


app.use(errorHandler)
app.use(notFound)

export default app;