import { Request, Response } from "express";
import Stripe from "stripe";
import { env } from "../config/index.js";
import { Prisma, TransactionType } from "@prisma/client";
import { creditUser } from "../services/walletService.js";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

export const stripeWebhookHandler = async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    return res.status(400).send("Missing signature");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const amount = session.amount_total;
      if (userId && amount) {
          const decimalAmount = new Prisma.Decimal(amount / 100);
          await creditUser(
            userId,
            decimalAmount,
            {
              type: TransactionType.DEPOSIT,
              reference: session.id,
              metadata: session,
            }
          );
      }
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
};
