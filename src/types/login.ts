import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const verifySchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type VerifyFormData = z.infer<typeof verifySchema>;

export type Organization = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

export type ViewState = "login" | "organizations" | "verify-2fa";