import dotenv from "dotenv";
import status from "http-status";
import AppError from "../errorHelper/AppError";

dotenv.config();

interface EnvConfig {
  NODE_ENV?: string;
  PORT: string;
  FRONTEND_URL: string;
  ACCESS_TOKEN_SECRET?: string;
  REFRESH_TOKEN_SECRET?: string;
  ACCESS_TOKEN_EXPIRES_IN?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  EMAIL_SENDER: {
    SMTP_USER: string;
    SMTP_PASS: string;
    SMTP_HOST: string;
    SMTP_PORT: string;
    SMTP_FROM: string;
  };
  STRIPE: {
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
  };
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  CLOUDINARY: {
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;
  };
  RAG:{
    OPENROUTER_API_KEY:string;
    OPENROUTER_EMBEDDING_MODEL:string;
    OPENROUTER_LLM_MODEL:string;
  },
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  GEMINI_API_KEY: string;
  CLIPDROW_API_KEY: string;
}

const loadEnvVariables = (): EnvConfig => {
  const requireEnvVariable = [
    "NODE_ENV",
    "PORT",
    "ACCESS_TOKEN_SECRET",
    "REFRESH_TOKEN_SECRET",
    "ACCESS_TOKEN_EXPIRES_IN",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "FRONTEND_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "OPENROUTER_API_KEY",
    "OPENROUTER_EMBEDDING_MODEL",
    "OPENROUTER_LLM_MODEL",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "GEMINI_API_KEY",
    "CLIPDROW_API_KEY"
  ];
  requireEnvVariable.forEach((variable) => {
    if (!process.env[variable]) {
      throw new AppError(
        status.INTERNAL_SERVER_ERROR,
        `Server configuration error: The required environment variable "${variable}" is not set. Verify your .env file or deployment environment settings.`,
      );
    }
  });

  return {
    NODE_ENV: process.env.NODE_ENV as string,
    PORT: process.env.PORT as string,
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET as string,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET as string,
    ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN as string,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET as string,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL as string,
    EMAIL_SENDER: {
      SMTP_USER: process.env.EMAIL_SENDER_SMTP_USER as string,
      SMTP_PASS: process.env.EMAIL_SENDER_SMTP_PASS as string,
      SMTP_HOST: process.env.EMAIL_SENDER_SMTP_HOST as string,
      SMTP_PORT: process.env.EMAIL_SENDER_SMTP_PORT as string,
      SMTP_FROM: process.env.EMAIL_SENDER_SMTP_FROM as string,
    },
    STRIPE: {
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY as string,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET as string,
    },
    FRONTEND_URL: process.env.FRONTEND_URL as string,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID as string,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET as string,
    CLOUDINARY: {
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME as string,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY as string,
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET as string
    },
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID as string,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET as string,
    RAG:{
      OPENROUTER_API_KEY:process.env.OPENROUTER_API_KEY as string,
      OPENROUTER_EMBEDDING_MODEL:process.env.OPENROUTER_EMBEDDING_MODEL as string,
      OPENROUTER_LLM_MODEL:process.env.OPENROUTER_LLM_MODEL as string,
    },
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL as string,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN as string,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY as string,
    CLIPDROW_API_KEY: process.env.CLIPDROW_API_KEY as string,
  };
};

export const envVars = loadEnvVariables();
