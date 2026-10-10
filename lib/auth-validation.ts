import { z } from "zod";
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(72)
  .refine(
    (v) => new TextEncoder().encode(v).length <= 72,
    "Password must fit within 72 UTF-8 bytes.",
  );
