import {
  Prisma,
  BetSide,
  BetStatus,
  MarketOutcome,
  MarketStatus,
  MarketEventType,
  TransactionType,
} from "@prisma/client";
import { getPrisma } from "../lib/prisma.js";
import { LMSRBondingCurve } from "../lib/bondingCurve.js";
import { lockFunds, releaseLockedFunds, settlePayout, forfeitLockedFunds } from "./walletService.js";

const Decimal = Prisma.Decimal;

const toDecimal = (value: number | string) => new Decimal(value);

const getBondingState = async (tx: Prisma.TransactionClient, marketId: string) => {
  const totals = await tx.bet.groupBy({
    by: ["side"],
    where: {
      marketId,
      status: BetStatus.PLACED,
    },
    _sum: {
      amount: true,
    },
  });

  const yes = totals.find((t) => t.side === BetSide.YES)?._sum.amount ?? new Decimal(0);
  const no = totals.find((t) => t.side === BetSide.NO)?._sum.amount ?? new Decimal(0);

  return {
    totalYes: yes,
    totalNo: no,
  };
};

export const marketOrderbook = async (marketId: string) => {
  const prisma = getPrisma();
  const market = await prisma.market.findUnique({ where: { id: marketId } });
  if (!market) {
    throw Object.assign(new Error("Market not found"), { status: 404 });
  }

  const { totalYes, totalNo } = await prisma.$transaction((tx) => getBondingState(tx, marketId));
  const curve = new LMSRBondingCurve(market.liquidity);
  const baseState = { totalYes, totalNo, liquidity: market.liquidity };
  const priceYes = curve.price(baseState, BetSide.YES);
  const priceNo = curve.price(baseState, BetSide.NO);

  const sampleSizes = [1, 10, 25, 50, 100];
  const quotes = sampleSizes.map((size) => ({
    size,
    yes: curve.quote(baseState, BetSide.YES, new Decimal(size)).price,
    no: curve.quote(baseState, BetSide.NO, new Decimal(size)).price,
  }));

  return {
    marketId,
    state: {
      totalYes: totalYes.toString(),
      totalNo: totalNo.toString(),
      liquidity: market.liquidity.toString(),
    },
    prices: {
      yes: priceYes,
      no: priceNo,
    },
    quotes,
  };
};

export const listMarkets = async (status?: MarketStatus) => {
  const prisma = getPrisma();
  return prisma.market.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      bets: {
        select: {
          id: true,
          amount: true,
          side: true,
        },
      },
    },
  });
};

export const getMarket = async (marketId: string) => {
  const prisma = getPrisma();
  return prisma.market.findUnique({
    where: { id: marketId },
    include: {
      bets: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      events: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
};

export const createMarket = async (
  input: {
    question: string;
    description?: string;
    closesAt?: Date;
    resolutionTime?: Date;
    liquidity?: number;
    feeBps?: number;
  },
  creatorId: string
) => {
  const prisma = getPrisma();
  const liquidity = input.liquidity ? toDecimal(input.liquidity) : new Decimal(100);

  const market = await prisma.market.create({
    data: {
      question: input.question,
      description: input.description,
      closesAt: input.closesAt,
      resolutionTime: input.resolutionTime,
      createdBy: creatorId,
      liquidity,
      feeBps: input.feeBps ?? 200,
      events: {
        create: {
          type: MarketEventType.MARKET_CREATED,
          actorId: creatorId,
          metadata: {},
        },
      },
      bondingCurves: {
        create: {
          totalYesStake: new Decimal(0),
          totalNoStake: new Decimal(0),
          liquidity,
          priceYes: 0.5,
          priceNo: 0.5,
          notes: "Initial state",
        },
      },
    },
  });

  return market;
};

export const placeBet = async (
  marketId: string,
  userId: string,
  side: BetSide,
  stake: number
) => {
  const prisma = getPrisma();
  const amount = toDecimal(stake);

  return prisma.$transaction(async (tx) => {
    const market = await tx.market.findUniqueOrThrow({ where: { id: marketId } });

    if (market.status !== MarketStatus.OPEN) {
      throw Object.assign(new Error("Market is not open"), { status: 400 });
    }

    if (market.closesAt && market.closesAt < new Date()) {
      throw Object.assign(new Error("Market closed"), { status: 400 });
    }

    const balances = await tx.userBalance.findUnique({ where: { userId } });
    if (!balances || balances.available.lt(amount)) {
      throw Object.assign(new Error("Insufficient balance"), { status: 400 });
    }

    const curve = new LMSRBondingCurve(market.liquidity);
    const bondingState = await getBondingState(tx, marketId);
    const quote = curve.quote(
      {
        totalYes: bondingState.totalYes,
        totalNo: bondingState.totalNo,
        liquidity: market.liquidity,
      },
      side,
      amount
    );

    const feeBps = market.feeBps ?? 0;
    const fee = quote.cost.mul(new Decimal(feeBps)).div(new Decimal(10_000));
    const totalDebit = quote.cost.add(fee);

    if (totalDebit.gt(balances.available)) {
      throw Object.assign(new Error("Insufficient balance for fee"), { status: 400 });
    }

    const bet = await tx.bet.create({
      data: {
        marketId,
        userId,
        side,
        amount: totalDebit,
        odds: new Decimal(quote.price),
      },
    });

    const lockTx = await lockFunds(userId, totalDebit, { betId: bet.id }, tx);

    await tx.transaction.update({
      where: { id: lockTx.id },
      data: { betId: bet.id },
    });

    await tx.marketEvent.create({
      data: {
        marketId,
        type: MarketEventType.BET_PLACED,
        actorId: userId,
        metadata: {
          betId: bet.id,
          side,
          stake: totalDebit.toString(),
          cost: quote.cost.toString(),
          fee: fee.toString(),
        },
        snapshot: {
          priceYes: quote.newState.totalYes.toString(),
          priceNo: quote.newState.totalNo.toString(),
        },
      },
    });

    await tx.bondingCurveSnapshot.create({
      data: {
        marketId,
        totalYesStake: quote.newState.totalYes,
        totalNoStake: quote.newState.totalNo,
        liquidity: market.liquidity,
        priceYes: curve.price(quote.newState, BetSide.YES),
        priceNo: curve.price(quote.newState, BetSide.NO),
        notes: `Bet ${bet.id} executed with slippage ${(quote.slippage * 100).toFixed(2)}%`,
      },
    });

    return { bet, quote, fee: fee.toString() };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
};

export const listBetsForMarket = async (marketId: string) => {
  const prisma = getPrisma();
  return prisma.bet.findMany({
    where: { marketId },
    orderBy: { createdAt: "desc" },
  });
};

export const resolveMarket = async (
  marketId: string,
  adminId: string,
  outcome: MarketOutcome
) => {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const market = await tx.market.findUniqueOrThrow({ where: { id: marketId } });

    if (market.status === MarketStatus.RESOLVED) {
      throw Object.assign(new Error("Market already resolved"), { status: 400 });
    }

    const bets = await tx.bet.findMany({ where: { marketId, status: BetStatus.PLACED } });

    if (bets.length === 0) {
      await tx.market.update({
        where: { id: marketId },
        data: {
          status: MarketStatus.RESOLVED,
          outcome,
          resolvedBy: adminId,
          resolvedAt: new Date(),
        },
      });
      return { payouts: [] };
    }

    if (outcome === MarketOutcome.VOID) {
      await Promise.all(
        bets.map((bet) =>
          releaseLockedFunds(bet.userId, bet.amount, bet.id, TransactionType.BET_REFUND, tx)
        )
      );
      await tx.bet.updateMany({
        where: { marketId },
        data: {
          status: BetStatus.CANCELLED,
        },
      });
    } else {
      const winningBets = bets.filter((bet) => bet.side === outcome);
      const totalPool = bets.reduce((acc, bet) => acc.add(bet.amount), new Decimal(0));
      const totalWinning = winningBets.reduce((acc, bet) => acc.add(bet.amount), new Decimal(0));

      if (totalWinning.eq(0)) {
        await Promise.all(
          bets.map((bet) =>
            releaseLockedFunds(bet.userId, bet.amount, bet.id, TransactionType.BET_REFUND, tx)
          )
        );
        await tx.bet.updateMany({
          where: { marketId },
          data: { status: BetStatus.CANCELLED },
        });
      } else {
        for (const bet of bets) {
          if (bet.side === outcome) {
            const payout = bet.amount.mul(totalPool).div(totalWinning);
            await settlePayout(bet.userId, payout, bet.id, bet.amount, tx);
            await tx.bet.update({
              where: { id: bet.id },
              data: {
                status: BetStatus.PAID_OUT,
                payoutAmount: payout,
              },
            });
          } else {
            await forfeitLockedFunds(bet.userId, bet.amount, bet.id, tx);
            await tx.bet.update({
              where: { id: bet.id },
              data: {
                status: BetStatus.LOST,
              },
            });
          }
        }
      }
    }

    await tx.market.update({
      where: { id: marketId },
      data: {
        status: MarketStatus.RESOLVED,
        outcome,
        resolvedBy: adminId,
        resolvedAt: new Date(),
      },
    });

    await tx.marketEvent.create({
      data: {
        marketId,
        type: MarketEventType.MARKET_RESOLVED,
        actorId: adminId,
        metadata: {
          outcome,
        },
      },
    });

    return {
      payouts: winningBets.map((bet) => ({
        betId: bet.id,
        userId: bet.userId,
      })),
    };
  });
};

export const pendingMarkets = async () => {
  const prisma = getPrisma();
  return prisma.market.findMany({
    where: { status: { in: [MarketStatus.OPEN, MarketStatus.CLOSED] } },
    orderBy: { closesAt: "asc" },
  });
};
