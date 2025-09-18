import { z } from "zod";

export const FunctionSpecificationSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  category: z.enum(["math", "string", "utility", "formatting"]),
  parameters: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        required: z.boolean().default(true),
        description: z.string().optional(),
      }),
    )
    .optional(),
  returnType: z.string(),
});

export type FunctionSpecification = z.infer<typeof FunctionSpecificationSchema>;
