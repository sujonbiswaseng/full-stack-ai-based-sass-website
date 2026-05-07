import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { envVars } from "../../config/env";
import openai from "../../config/gemini.config";
import AppError from "../../errorHelper/AppError";
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import { prisma } from "../../lib/prisma";
import axios from "axios";
import { checkAndUpdateAiLimit } from "./ai.limit";
const DAILY_LIMIT = 10;

const generateArticle = async (
  userId: string,
  email: string,
  prompt: string,
) => {
  try {
    const existuser =
      (await prisma.user.findUnique({
        where: { id: userId },
      })) ||
      (await prisma.user.findUnique({
        where: { email },
      }));

    if (!existuser) {
      throw new AppError(404, "Authenticated user not found");
    }

    const data=await checkAndUpdateAiLimit(existuser.id)

    if ((data.remaining < 0 || data.remaining>10) && existuser.role !=="ADMIN") {
      throw new AppError(400, "Daily limit reached. Try again after 24 hours.");
    }



    const response = await openai.chat.completions.create({
      model: "gemini-3-flash-preview",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(content || "{}");

    await prisma.aIContent.create({
      data: {
        prompt,
        generatedText: content as string,
        userId: existuser.id,
      },
    });

    await prisma.user.update({
      where: { id: existuser.id },
      data: { promptCount: { increment: 1 } },
    });

    return result;
  } catch (error: any) {
    if (error?.status === 429) {

      throw new AppError(error.status, `"Rate limit exceeded and status(${error.status}), You are sending too many requests. Please slow down and try again later."`);
    }
    throw new AppError(500, error.message || "An unexpected error occurred");
  }
};

const generateRecommendations = async (
  userId: string,
  email: string,
  prompt: string,
) => {
  try {
    const existuser = await prisma.user.findUnique({
      where: { id: userId, email },
    });
    if (!existuser) {
      throw new AppError(404, "Authenticated user not found");
    }
    const data=await checkAndUpdateAiLimit(existuser.id)

    if ((data.remaining < 0 || data.remaining>10) && existuser.role !=="ADMIN") {
      throw new AppError(400, "Daily limit reached. Try again after 24 hours.");
    }

    const history = await prisma.userActivity.findMany({
      where: { userId: existuser.id },
    });
    const categories = history.map((item) => item.category);

    const products = await prisma.product.findMany({
      where: { category: { name: { in: categories } } },
      include: { category: true },
    });
    const prompt = `Based on the user's interests (${categories.join(", ")}), suggest the most suitable products from the following list: ${products.map((product) => product.title).join(", ")}. Please provide your recommendations in a clear JSON format for easy parsing.`;

    const response = await openai.chat.completions.create({
      model: "gemini-3-flash-preview",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(content || "{}");

    await prisma.aIContent.create({
      data: {
        prompt,
        generatedText: content as string,
        userId: existuser.id,
      },
    });

    await prisma.user.update({
      where: { id: existuser.id },
      data: { promptCount: { increment: 1 } },
    });

    return result;
  } catch (error: any) {
    if (error?.status === 429) {

      throw new AppError(error.status, `"Rate limit exceeded and status(${error.status}), You are sending too many requests. Please slow down and try again later."`);
    }
    throw new AppError(500, error.message || "An unexpected error occurred");
   
  }
};

const chatAssistand = async (userId: string, prompt: string) => {
  try {
    const buildPrompt = ({ userName, products, userHistory, message }: any) => {
      return `
    You are an AI assistant for an AI SaaS platform.
    
    User name:
    ${userName}
    
    User purchase history:
    ${JSON.stringify(userHistory)}
    
    Available products:
    ${JSON.stringify(products)}
    
    User message:
    ${message}
    
    Rules:
    - Be professional
    - Recommend products
    - Answer shortly
    - Use platform context
    `;
    };

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, "Authenticated user not found");
    }
    const data=await checkAndUpdateAiLimit(user.id)

    if ((data.remaining < 0 || data.remaining>10) && user.role !=="ADMIN") {
      throw new AppError(400, "Daily limit reached. Try again after 24 hours.");
    }

    const products = await prisma.product.findMany({});

    // 3. Get order history
    const orders = await prisma.order.findMany({
      where: { userId },
    });

    const buildprompt = buildPrompt({
      userName: user?.name,
      products,
      userHistory: orders,
      prompt,
    });

    const response = await openai.chat.completions.create({
      model: "gemini-3-flash-preview",
      messages: [
        {
          role: "user",
          content: buildprompt,
        },
      ],
      response_format: {
        type: "json_object",
      },
    });

    const aiResponse = response.choices[0].message.content;
    const result = JSON.parse(aiResponse || "{}");

    await prisma.$transaction(async (tx) => {
      (
        await tx.aIContent.create({
          data: {
            prompt,
            generatedText: aiResponse as string,
            userId: user?.id as string,
          },
        }),
        await tx.user.update({
          where: { id: user.id as string },
          data: { promptCount: { increment: 1 } },
        })
      );
    });
    return result;
  } catch (error: any) {
    if (error?.status === 429) {

      throw new AppError(error.status, `"Rate limit exceeded and status(${error.status}), You are sending too many requests. Please slow down and try again later."`);
    }
    throw new AppError(500, error.message || "An unexpected error occurred");
  }
};

export const geminiService = {
  generateArticle,
  generateRecommendations,
  chatAssistand,
};
