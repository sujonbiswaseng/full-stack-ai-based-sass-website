import { z } from "zod";

export const CreateProductSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long"),
  description: z.string().min(10, "Description must be at least 10 characters long"),
  price: z.number().positive("Price must be a positive number"),
  location: z.string().min(2, "Location is required"),
  deliveryCharge: z.number().int().nonnegative("Delivery charge cannot be negative"),
  brand: z.string().nullable().optional(),
  warrenty: z.string().min(1, "Warranty information is required"),
  images: z.any(),
  category_name: z.string().min(1, "Category name is required"),
  date: z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  })
  .transform((val) => new Date(val).toISOString())
});

// For partial updates
export const UpdateProductSchema = CreateProductSchema.partial();