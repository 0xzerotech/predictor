import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import {
  pendingMarketsHandler,
  resolveMarketAdminHandler,
  listWithdrawalRequestsHandler,
  processWithdrawalHandler,
} from "../controllers/adminController.js";

const router = Router();

router.use(authenticate, requireRole(["ADMIN"]));

router.get("/markets/pending", pendingMarketsHandler);
router.post("/markets/:id/resolve", resolveMarketAdminHandler);
router.get("/withdrawals", listWithdrawalRequestsHandler);
router.post("/withdrawals/:id/process", processWithdrawalHandler);

export default router;
