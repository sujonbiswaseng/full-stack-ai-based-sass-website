import z from "zod";

export const CreateorderData = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone: z.string().min(11).max(14),
  address: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().min(1),
      }),
    )
    .min(1),
});
