import { Router } from "express";
import authRouter from "./auth.js";
import userRouter from "./user.js";
import marketRouter from "./markets.js";
import adminRouter from "./admin.js";
import webhookRouter from "./webhooks.js";

export const router = Router();

router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/markets", marketRouter);
router.use("/admin", adminRouter);
router.use("/webhooks", webhookRouter);

export default router;
