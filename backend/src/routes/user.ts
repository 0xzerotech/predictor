import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  meHandler,
  balanceHandler,
  transactionsHandler,
  depositHandler,
  withdrawHandler,
} from "../controllers/userController.js";

const router = Router();

router.use(authenticate);

router.get("/me", meHandler);
router.get("/balance", balanceHandler);
router.get("/transactions", transactionsHandler);
router.post("/deposit", depositHandler);
router.post("/withdraw", withdrawHandler);

export default router;
