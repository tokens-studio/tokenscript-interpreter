import { z } from "zod";

export const FunctionSpecificationSchema = z.object({
  name: z.string(),
  type: z.literal("function"),
  input: z
    .object({
      type: z.literal("object"),
      properties: z.record(z.string(), z.any()).optional(),
    })
    .optional(),
  script: z.object({
    type: z.string(),
    script: z.string(),
  }),
  keyword: z.string(),
  description: z.string().optional(),
  requirements: z.array(z.string()).optional(),
});

export type FunctionSpecification = z.infer<typeof FunctionSpecificationSchema>;
