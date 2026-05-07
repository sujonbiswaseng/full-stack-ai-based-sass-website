import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { envVars } from "../../config/env";
import openai from "../../config/gemini.config";
import AppError from "../../errorHelper/AppError";
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import { prisma } from "../../lib/prisma";
import axios from 'axios';

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

    if (
      existuser.plan === "FREE" &&
      existuser.role !== "ADMIN" &&
      existuser.promptCount >= 10
    ) {
      throw new AppError(400, "You have reached the limit...");
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

    return content;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(500, "Failed to generate article");
  }
};




export const geminiService = {
  generateArticle,
  
};
