import OpenAI from "openai";
import { envVars } from "./env";

const openai = new OpenAI({
    apiKey: envVars.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

export default openai