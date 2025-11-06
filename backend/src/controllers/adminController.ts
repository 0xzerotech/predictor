import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth.js";
import { pendingMarkets, resolveMarket } from "../services/marketService.js";
import { getPrisma } from "../lib/prisma.js";
import { MarketOutcome, TransactionType, TransactionDirection } from "@prisma/client";

export const pendingMarketsHandler = async (_req: AuthRequest, res: Response) => {
  const markets = await pendingMarkets();
  res.json(markets);
};

const resolveSchema = z.object({
  outcome: z.nativeEnum(MarketOutcome),
});

export const resolveMarketAdminHandler = async (req: AuthRequest, res: Response) => {
  const parsed = resolveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid resolve payload" });
  }
  const result = await resolveMarket(req.params.id, req.user!.id, parsed.data.outcome);
  res.json(result);
};

export const listWithdrawalRequestsHandler = async (_req: AuthRequest, res: Response) => {
  const prisma = getPrisma();
  const requests = await prisma.transaction.findMany({
    where: { type: TransactionType.WITHDRAWAL_REQUEST },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(requests);
};

const approveSchema = z.object({ approved: z.boolean(), notes: z.string().optional() });

export const processWithdrawalHandler = async (req: AuthRequest, res: Response) => {
  const parsed = approveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  const prisma = getPrisma();
  const transaction = await prisma.transaction.findUnique({ where: { id: req.params.id } });
  if (!transaction || transaction.type !== TransactionType.WITHDRAWAL_REQUEST) {
    return res.status(404).json({ message: "Withdrawal request not found" });
  }

  const result = await prisma.$transaction(async (tx) => {
    const userBalance = await tx.userBalance.findUniqueOrThrow({ where: { userId: transaction.userId } });

    if (parsed.data.approved) {
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          type: TransactionType.WITHDRAWAL_APPROVED,
          metadata: {
            ...transaction.metadata,
            approvedBy: req.user!.id,
            notes: parsed.data.notes,
          },
        },
      });

      await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          userId: transaction.userId,
          direction: TransactionDirection.DEBIT,
          amount: transaction.amount,
          notes: "Withdrawal approved",
        },
      });

      await tx.userBalance.update({
        where: { userId: transaction.userId },
        data: {
          locked: userBalance.locked.sub(transaction.amount),
        },
      });
    } else {
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          type: TransactionType.WITHDRAWAL_REJECTED,
          metadata: {
            ...transaction.metadata,
            approvedBy: req.user!.id,
            notes: parsed.data.notes,
          },
        },
      });

      await tx.userBalance.update({
        where: { userId: transaction.userId },
        data: {
          available: userBalance.available.add(transaction.amount),
          locked: userBalance.locked.sub(transaction.amount),
        },
      });

      await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          userId: transaction.userId,
          direction: TransactionDirection.CREDIT,
          amount: transaction.amount,
          notes: "Withdrawal rejected",
        },
      });
    }

    return tx.transaction.findUnique({ where: { id: transaction.id } });
  });

  res.json(result);
};
