import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { env } from "../config/index.js";
import { getPrisma } from "../lib/prisma.js";

const SALT_ROUNDS = 12;

export interface SignUpInput {
  email: string;
  password: string;
  username?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const signUp = async ({ email, password, username }: SignUpInput) => {
  const prisma = getPrisma();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          username,
          passwordHash,
          balances: {
            create: {
              available: new Prisma.Decimal(0),
              locked: new Prisma.Decimal(0),
            },
          },
        },
      });
      return created;
    });

    const tokens = issueTokens(user.id, user.email, user.role);

    return {
      user,
      tokens,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw Object.assign(new Error("Email already in use"), { status: 409 });
    }
    throw error;
  }
};

export const login = async (email: string, password: string) => {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error("Invalid credentials"), { status: 401 });
  }
  const tokens = issueTokens(user.id, user.email, user.role);
  return { user, tokens };
};

export const issueTokens = (userId: string, email: string, role: string): AuthTokens => {
  const accessToken = jwt.sign({ sub: userId, email, role }, env.JWT_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ sub: userId, email, role }, env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
  return { accessToken, refreshToken };
};

export const refresh = async (token: string) => {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as {
      sub: string;
      email: string;
      role: string;
    };
    return issueTokens(payload.sub, payload.email, payload.role);
  } catch (error) {
    throw Object.assign(new Error("Invalid refresh token"), { status: 401 });
  }
};
