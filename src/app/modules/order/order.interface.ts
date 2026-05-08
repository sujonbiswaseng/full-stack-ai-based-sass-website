import z from "zod";
import { CreateorderData } from "./order.validation";
// create orderdata type
export type ICreateorderData=z.infer<typeof CreateorderData>