import { z } from "zod";
import { insertServiceOrderSchema } from "@shared/schema";

// Extendemos el esquema para incluir los campos que están omitidos en el esquema original
export const extendedServiceOrderSchema = insertServiceOrderSchema.extend({
  // Agregamos los campos omitidos con sus tipos correspondientes
  clientSignature: z.string().optional(),
  photos: z.array(z.string()).optional(),
  clientApproval: z.boolean().optional(),
  clientApprovalDate: z.date().nullable().optional(),
  cost: z.number().int().nullable().optional(),
});

export type ExtendedServiceOrder = z.infer<typeof extendedServiceOrderSchema>;