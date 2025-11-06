import { Prisma, TransactionDirection, TransactionType } from "@prisma/client";
import { getPrisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

type TxClient = Prisma.TransactionClient;

const ensureBalanceRecord = async (tx: TxClient, userId: string) => {
  const existing = await tx.userBalance.findUnique({ where: { userId } });
  if (existing) {
    return existing;
  }
  return tx.userBalance.create({
    data: {
      userId,
      available: new Prisma.Decimal(0),
      locked: new Prisma.Decimal(0),
    },
  });
};

interface TransactionInput {
  userId: string;
  type: TransactionType;
  direction: TransactionDirection;
  amount: Prisma.Decimal;
  reference?: string;
  metadata?: Prisma.InputJsonValue;
  betId?: string;
  notes?: string;
  applyBalance: (balance: {
    available: Prisma.Decimal;
    locked: Prisma.Decimal;
  }) => {
    available: Prisma.Decimal;
    locked: Prisma.Decimal;
  };
}

const createTransactionWithBalanceTx = async (tx: TxClient, input: TransactionInput) => {
  const current = await ensureBalanceRecord(tx, input.userId);

  const { available, locked } = input.applyBalance({
    available: current.available,
    locked: current.locked,
  });

  if (available.lt(0) || locked.lt(0)) {
    throw Object.assign(new Error("Insufficient funds"), { status: 400 });
  }

  const transaction = await tx.transaction.create({
    data: {
      userId: input.userId,
      type: input.type,
      direction: input.direction,
      amount: input.amount,
      balanceBefore: current.available,
      balanceAfter: available,
      reference: input.reference,
      metadata: input.metadata,
      betId: input.betId,
    },
  });

  await tx.userBalance.update({
    where: { userId: input.userId },
    data: {
      available,
      locked,
    },
  });

  await tx.ledgerEntry.create({
    data: {
      transactionId: transaction.id,
      userId: input.userId,
      direction: input.direction,
      amount: input.amount,
      notes: input.notes,
    },
  });

  return transaction;
};

const runInTransaction = async <T>(
  fn: (tx: TxClient) => Promise<T>,
  tx?: TxClient,
  isolationLevel: Prisma.TransactionIsolationLevel = Prisma.TransactionIsolationLevel.Serializable
) => {
  if (tx) {
    return fn(tx);
  }
  const prisma = getPrisma();
  return prisma.$transaction(fn, { isolationLevel });
};

export const creditUser = async (
  userId: string,
  amount: Prisma.Decimal,
  opts: Partial<Omit<TransactionInput, "applyBalance" | "amount" | "userId" | "direction">> = {},
  tx?: TxClient
) => {
  return runInTransaction(async (trx) => {
    return createTransactionWithBalanceTx(trx, {
      userId,
      amount,
      type: opts.type ?? TransactionType.PAYOUT,
      direction: TransactionDirection.CREDIT,
      reference: opts.reference,
      metadata: opts.metadata,
      betId: opts.betId,
      notes: opts.notes,
      applyBalance: ({ available, locked }) => ({
        available: available.add(amount),
        locked,
      }),
    });
  }, tx);
};

export const debitUser = async (
  userId: string,
  amount: Prisma.Decimal,
  opts: Partial<Omit<TransactionInput, "applyBalance" | "amount" | "userId" | "direction">> = {},
  tx?: TxClient
) => {
  return runInTransaction(async (trx) => {
    return createTransactionWithBalanceTx(trx, {
      userId,
      amount,
      type: opts.type ?? TransactionType.BET_DEBIT,
      direction: TransactionDirection.DEBIT,
      reference: opts.reference,
      metadata: opts.metadata,
      betId: opts.betId,
      notes: opts.notes,
      applyBalance: ({ available, locked }) => ({
        available: available.sub(amount),
        locked,
      }),
    });
  }, tx);
};

export const lockFunds = async (
  userId: string,
  amount: Prisma.Decimal,
  opts: { betId?: string; reference?: string; metadata?: Prisma.InputJsonValue } = {},
  tx?: TxClient
) => {
  return runInTransaction(async (trx) => {
    return createTransactionWithBalanceTx(trx, {
      userId,
      amount,
      type: TransactionType.BET_DEBIT,
      direction: TransactionDirection.DEBIT,
      betId: opts.betId,
      reference: opts.reference,
      metadata: opts.metadata,
      notes: "Funds locked for bet",
      applyBalance: ({ available, locked }) => ({
        available: available.sub(amount),
        locked: locked.add(amount),
      }),
    });
  }, tx);
};

export const releaseLockedFunds = async (
  userId: string,
  amount: Prisma.Decimal,
  betId: string,
  type: TransactionType,
  tx?: TxClient
) => {
  return runInTransaction(async (trx) => {
    return createTransactionWithBalanceTx(trx, {
      userId,
      amount,
      type,
      direction: TransactionDirection.CREDIT,
      betId,
      notes: "Funds released",
      applyBalance: ({ available, locked }) => ({
        available: available.add(amount),
        locked: locked.sub(amount),
      }),
    });
  }, tx);
};

export const settlePayout = async (
  userId: string,
  payoutAmount: Prisma.Decimal,
  betId: string,
  lockedStake: Prisma.Decimal,
  tx?: TxClient
) => {
  return runInTransaction(async (trx) => {
    logger.info({ userId, betId, payoutAmount: payoutAmount.toString() }, "Settling payout");
    return createTransactionWithBalanceTx(trx, {
      userId,
      amount: payoutAmount,
      type: TransactionType.PAYOUT,
      direction: TransactionDirection.CREDIT,
      betId,
      notes: "Payout from resolved market",
      applyBalance: ({ available, locked }) => ({
        available: available.add(payoutAmount),
        locked: locked.sub(lockedStake),
      }),
    });
  }, tx);
};

export const forfeitLockedFunds = async (
  userId: string,
  amount: Prisma.Decimal,
  betId: string,
  tx?: TxClient
) => {
  return runInTransaction(async (trx) => {
    return createTransactionWithBalanceTx(trx, {
      userId,
      amount,
      type: TransactionType.BET_FORFEIT,
      direction: TransactionDirection.DEBIT,
      betId,
      notes: "Locked funds forfeited on loss",
      applyBalance: ({ available, locked }) => ({
        available,
        locked: locked.sub(amount),
      }),
    });
  }, tx);
};

export const getBalances = async (userId: string) => {
  const prisma = getPrisma();
  return prisma.userBalance.findUnique({ where: { userId } });
};

export const listTransactions = async (userId: string, limit = 50) => {
  const prisma = getPrisma();
  return prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
};
