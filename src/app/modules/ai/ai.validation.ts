import z from "zod";

export const createAiData = z.object({
    image:z.any()
  }).strict()