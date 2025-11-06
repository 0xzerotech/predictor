import { LMSRBondingCurve, defaultBondingCurveState } from "../lib/bondingCurve.js";

const simulation = () => {
  const curve = new LMSRBondingCurve(120);
  const trades = [
    { side: "YES" as const, amount: 50 },
    { side: "NO" as const, amount: 35 },
    { side: "YES" as const, amount: 120 },
    { side: "NO" as const, amount: 20 },
    { side: "YES" as const, amount: 80 },
  ];

  const snapshots = curve.simulate(defaultBondingCurveState, trades);

  console.log("Bonding curve simulation results:");
  snapshots.forEach((snap, idx) => {
    console.log(
      `Trade ${idx + 1}: side=${trades[idx].side} amount=${trades[idx].amount} | priceYes=${snap.priceYes.toFixed(
        4,
      )} priceNo=${snap.priceNo.toFixed(4)} totalYes=${snap.state.totalYes.toString()} totalNo=${snap.state.totalNo.toString()}`,
    );
  });
};

simulation();
