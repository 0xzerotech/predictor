import { Prisma } from "@prisma/client";

export type Side = "YES" | "NO";

export interface BondingCurveState {
  totalYes: Prisma.Decimal;
  totalNo: Prisma.Decimal;
  liquidity: Prisma.Decimal;
}

export interface QuoteResult {
  price: number;
  cost: Prisma.Decimal;
  newState: BondingCurveState;
  impliedProbability: number;
  slippage: number;
}

const Decimal = Prisma.Decimal;

const exp = (value: Prisma.Decimal) => new Decimal(Math.exp(Number(value)));
const ln = (value: Prisma.Decimal) => new Decimal(Math.log(Number(value)));

const toNumber = (value: Prisma.Decimal) => Number(value.toString());

export class LMSRBondingCurve {
  private b: Prisma.Decimal;

  constructor(liquidity: Prisma.Decimal | number = 100) {
    this.b = new Decimal(liquidity);
  }

  private costFunction(state: BondingCurveState) {
    const yes = state.totalYes.div(this.b);
    const no = state.totalNo.div(this.b);
    return this.b.mul(ln(exp(yes).add(exp(no))));
  }

  public price(state: BondingCurveState, side: Side) {
    const numerator = Math.exp(Number((side === "YES" ? state.totalYes : state.totalNo).div(this.b)));
    const denominator =
      Math.exp(Number(state.totalYes.div(this.b))) + Math.exp(Number(state.totalNo.div(this.b)));
    return numerator / denominator;
  }

  public quote(state: BondingCurveState, side: Side, amount: Prisma.Decimal): QuoteResult {
    const initialCost = this.costFunction(state);
    const newState = {
      totalYes: side === "YES" ? state.totalYes.add(amount) : state.totalYes,
      totalNo: side === "NO" ? state.totalNo.add(amount) : state.totalNo,
      liquidity: state.liquidity,
    };
    const finalCost = this.costFunction(newState);
    const cost = finalCost.sub(initialCost);
    const prePrice = this.price(state, side);
    const postPrice = this.price(newState, side);
    const impliedProbability = postPrice;
    const slippage = (postPrice - prePrice) / prePrice;
    return {
      price: postPrice,
      cost,
      newState,
      impliedProbability,
      slippage: Number.isFinite(slippage) ? slippage : 0,
    };
  }

  public simulate(initial: BondingCurveState, trades: Array<{ side: Side; amount: number }>) {
    let state = initial;
    const snapshots: Array<{ state: BondingCurveState; priceYes: number; priceNo: number; cost: number }>
      = [];

    for (const trade of trades) {
      const quote = this.quote(state, trade.side, new Decimal(trade.amount));
      state = quote.newState;
      snapshots.push({
        state,
        priceYes: this.price(state, "YES"),
        priceNo: this.price(state, "NO"),
        cost: Number(quote.cost.toString()),
      });
    }

    return snapshots;
  }
}

export const defaultBondingCurveState: BondingCurveState = {
  totalYes: new Decimal(0),
  totalNo: new Decimal(0),
  liquidity: new Decimal(100),
};
