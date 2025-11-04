import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth.js";
import { getBalances, listTransactions, creditUser } from "../services/walletService.js";
import { Prisma, TransactionType, TransactionDirection } from "@prisma/client";
import { getPrisma } from "../lib/prisma.js";

const Decimal = Prisma.Decimal;

export const meHandler = async (req: AuthRequest, res: Response) => {
  const prisma = getPrisma();
  const me = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      username: true,
    },
  });
  res.json(me);
};

export const balanceHandler = async (req: AuthRequest, res: Response) => {
  const balance = await getBalances(req.user!.id);
  res.json(balance ?? { available: "0", locked: "0" });
};

export const transactionsHandler = async (req: AuthRequest, res: Response) => {
  const limit = Number(req.query.limit ?? 50);
  const txs = await listTransactions(req.user!.id, limit);
  res.json(txs);
};

const depositSchema = z.object({
  amount: z.number().positive(),
  reference: z.string().optional(),
});

export const depositHandler = async (req: AuthRequest, res: Response) => {
  const parsed = depositSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid deposit request" });
  }

  const amount = new Decimal(parsed.data.amount);
  const tx = await creditUser(
    req.user!.id,
    amount,
    {
      type: TransactionType.DEPOSIT,
      reference: parsed.data.reference,
      notes: "Manual deposit",
    }
  );
  res.status(201).json(tx);
};

const withdrawSchema = z.object({
  amount: z.number().positive(),
  destination: z.string().optional(),
});

export const withdrawHandler = async (req: AuthRequest, res: Response) => {
  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid withdraw request" });
  }
  const amount = new Decimal(parsed.data.amount);

  const prisma = getPrisma();

  const txRecord = await prisma.$transaction(async (tx) => {
    const balance = await tx.userBalance.findUnique({ where: { userId: req.user!.id } });
    if (!balance || balance.available.lt(amount)) {
      throw Object.assign(new Error("Insufficient balance"), { status: 400 });
    }

    const withdrawalTx = await tx.transaction.create({
      data: {
        userId: req.user!.id,
        type: TransactionType.WITHDRAWAL_REQUEST,
        direction: TransactionDirection.DEBIT,
        amount,
        balanceBefore: balance.available,
        balanceAfter: balance.available.sub(amount),
        reference: parsed.data.destination,
        metadata: {
          destination: parsed.data.destination,
        },
      },
    });

    await tx.userBalance.update({
      where: { userId: req.user!.id },
      data: {
        available: balance.available.sub(amount),
        locked: balance.locked.add(amount),
      },
    });

    await tx.ledgerEntry.create({
      data: {
        transactionId: withdrawalTx.id,
        userId: req.user!.id,
        direction: TransactionDirection.DEBIT,
        amount,
        notes: "Withdrawal request",
      },
    });

    return withdrawalTx;
  });
  
  res.status(201).json({
    message: "Withdrawal requested",
    transaction: txRecord,
  });
};
