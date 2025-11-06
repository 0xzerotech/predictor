import { Response } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth.js";
import {
  listMarkets,
  getMarket,
  createMarket,
  placeBet,
  listBetsForMarket,
  resolveMarket,
  marketOrderbook,
} from "../services/marketService.js";
import { BetSide, MarketOutcome, MarketStatus } from "@prisma/client";

const betSchema = z.object({
  side: z.nativeEnum(BetSide),
  amount: z.number().positive(),
});

export const listMarketsHandler = async (req: AuthRequest, res: Response) => {
  const status = req.query.status as MarketStatus | undefined;
  const markets = await listMarkets(status);
  res.json(markets);
};

export const marketDetailHandler = async (req: AuthRequest, res: Response) => {
  const market = await getMarket(req.params.id);
  if (!market) {
    return res.status(404).json({ message: "Market not found" });
  }
  res.json(market);
};

const createMarketSchema = z.object({
  question: z.string().min(10),
  description: z.string().optional(),
  closesAt: z.string().datetime().optional(),
  resolutionTime: z.string().datetime().optional(),
  liquidity: z.number().min(10).max(10_000).optional(),
  feeBps: z.number().min(0).max(1000).optional(),
});

export const createMarketHandler = async (req: AuthRequest, res: Response) => {
  const parsed = createMarketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid market payload", errors: parsed.error.flatten() });
  }

  const market = await createMarket(
    {
      question: parsed.data.question,
      description: parsed.data.description,
      closesAt: parsed.data.closesAt ? new Date(parsed.data.closesAt) : undefined,
      resolutionTime: parsed.data.resolutionTime ? new Date(parsed.data.resolutionTime) : undefined,
      liquidity: parsed.data.liquidity,
      feeBps: parsed.data.feeBps,
    },
    req.user!.id
  );
  res.status(201).json(market);
};

export const betHandler = async (req: AuthRequest, res: Response) => {
  const parsed = betSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid bet payload", errors: parsed.error.flatten() });
  }
  const result = await placeBet(req.params.id, req.user!.id, parsed.data.side, parsed.data.amount);
  res.status(201).json(result);
};

export const marketBetsHandler = async (req: AuthRequest, res: Response) => {
  const bets = await listBetsForMarket(req.params.id);
  res.json(bets);
};

export const marketOrderbookHandler = async (req: AuthRequest, res: Response) => {
  const book = await marketOrderbook(req.params.id);
  res.json(book);
};

const resolveSchema = z.object({
  outcome: z.nativeEnum(MarketOutcome),
});

export const resolveMarketHandler = async (req: AuthRequest, res: Response) => {
  const parsed = resolveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid resolve payload" });
  }

  const result = await resolveMarket(req.params.id, req.user!.id, parsed.data.outcome);
  res.json(result);
};
