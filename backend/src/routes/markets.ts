import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  listMarketsHandler,
  marketDetailHandler,
  createMarketHandler,
  betHandler,
  marketBetsHandler,
  marketOrderbookHandler,
} from "../controllers/marketController.js";

const router = Router();

router.get("/", listMarketsHandler);
router.get("/:id", marketDetailHandler);
router.get("/:id/bets", marketBetsHandler);
router.get("/:id/book", marketOrderbookHandler);

router.post("/", authenticate, createMarketHandler);
router.post("/:id/bet", authenticate, betHandler);

export default router;
