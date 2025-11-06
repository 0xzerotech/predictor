import { Router } from "express";
import { signupHandler, loginHandler, refreshHandler } from "../controllers/authController.js";

const router = Router();

router.post("/signup", signupHandler);
router.post("/login", loginHandler);
router.post("/refresh", refreshHandler);

export default router;
