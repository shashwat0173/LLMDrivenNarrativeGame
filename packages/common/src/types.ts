import { z } from "zod";

export const SigninSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string(),
});

export const SignupSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string(),
});
