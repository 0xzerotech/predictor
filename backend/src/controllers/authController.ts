import { Request, Response } from "express";
import { z } from "zod";
import { signUp, login, refresh } from "../services/authService.js";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().optional(),
});

export const signupHandler = async (req: Request, res: Response) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid signup data", errors: parsed.error.flatten() });
  }

  const { user, tokens } = await signUp(parsed.data);
  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
    tokens,
  });
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const loginHandler = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid login data", errors: parsed.error.flatten() });
  }

  const { user, tokens } = await login(parsed.data.email, parsed.data.password);
  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
    tokens,
  });
};

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export const refreshHandler = async (req: Request, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid refresh payload" });
  }

  const tokens = await refresh(parsed.data.refreshToken);
  res.json(tokens);
};
