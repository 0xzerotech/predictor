import { useMemo } from "react";
import { motion } from "framer-motion";

import { UiMarket } from "../../types";

interface CurvePreviewProps {
  market: UiMarket;
}

interface CurvePoint {
  x: number;
  y: number;
  supply: number;
  price: number;
}

const VIEWBOX_WIDTH = 640;
const VIEWBOX_HEIGHT = 320;

const buildCurvePoints = (market: UiMarket): CurvePoint[] => {
  const steps = 48;
  const basePrice = Math.max(0.01, market.basePrice / 1_000_000);
  const slope = Math.max(0.0001, market.slopeBps / 10_000);
  const curvature = Math.max(0.0001, market.curvatureBps / 10_000);
  const supplyCap = Math.max(market.maxSupply || 0, market.supply * 1.8, 1);
  const hypeFactor = Math.log10(market.hypeScore + 10);
  const attentionRatio = Math.min(1.5, market.hypeScore / Math.max(1, market.bondVolumeTarget));

  const points: CurvePoint[] = [];

  for (let i = 0; i < steps; i += 1) {
    const t = i / (steps - 1);
    const supply = supplyCap * t;
    const momentum = slope * 8 + attentionRatio * 0.6 + hypeFactor * 0.25;
    const curvatureStrength = curvature * 4 + hypeFactor * 0.3;
    const price = basePrice * (1 + momentum * Math.pow(t, 0.9) + curvatureStrength * Math.pow(t, 2.1));

    points.push({ x: t, y: price, supply, price });
  }

  return points;
};

export const CurvePreview = ({ market }: CurvePreviewProps) => {
  const { path, areaPath, points } = useMemo(() => {
    const rawPoints = buildCurvePoints(market);
    const highestPrice = rawPoints.reduce((acc, point) => Math.max(acc, point.price), 0.0001);

    const coords = rawPoints.map((point) => {
      const x = point.x * VIEWBOX_WIDTH;
      const normalizedY = point.price / highestPrice;
      const y = VIEWBOX_HEIGHT - normalizedY * (VIEWBOX_HEIGHT - 32) - 12;
      return { ...point, x, y };
    });

    const curvePath = coords
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
      .join(" ");

    const area = `${curvePath} L ${VIEWBOX_WIDTH},${VIEWBOX_HEIGHT} L 0,${VIEWBOX_HEIGHT} Z`;

    return { path: curvePath, areaPath: area, points: coords };
  }, [market]);

  const currentCompletion = Math.min(100, (market.volume / Math.max(1, market.bondVolumeTarget)) * 100);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35rem] text-white/40">Bonding curve telemetry</p>
            <h3 className="font-display text-2xl text-white">Curve shape simulation</h3>
          </div>
          <div className="text-right text-xs uppercase tracking-[0.3rem] text-white/40">
            <p>Base price {basePriceLabel(market)}</p>
            <p>Completion {currentCompletion.toFixed(1)}%</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 via-transparent to-black/40 p-4">
          <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="h-72 w-full">
            <defs>
              <linearGradient id="curveStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.9} />
                <stop offset="60%" stopColor="#633bf5" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#f472b6" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="curveFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                <stop offset="75%" stopColor="#633bf5" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <g stroke="rgba(255,255,255,0.08)" strokeDasharray="4 8">
              {Array.from({ length: 6 }).map((_, index) => {
                const x = (VIEWBOX_WIDTH / 5) * index;
                return <line key={`v-${index}`} x1={x} x2={x} y1={0} y2={VIEWBOX_HEIGHT} />;
              })}
              {Array.from({ length: 5 }).map((_, index) => {
                const y = (VIEWBOX_HEIGHT / 4) * index;
                return <line key={`h-${index}`} x1={0} x2={VIEWBOX_WIDTH} y1={y} y2={y} />;
              })}
            </g>

            <path d={areaPath} fill="url(#curveFill)" opacity={0.8} />
            <motion.path d={path} fill="none" stroke="url(#curveStroke)" strokeWidth={3.5} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeOut" }} />

            {points.filter((_, index) => index % 8 === 0).map((point) => (
              <g key={`${point.x}-${point.y}`}>
                <circle cx={point.x} cy={point.y} r={4} fill="#38bdf8" />
                <text x={point.x + 6} y={point.y - 8} fill="rgba(255,255,255,0.6)" fontSize={10}>
                  {"$" + point.price.toFixed(2)}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Curve momentum" value={`${(market.slopeBps / 100).toFixed(2)}%`} caption="Slope basis points" />
        <StatTile label="Curvature" value={`${(market.curvatureBps / 100).toFixed(2)}%`} caption="Convexity pressure" />
        <StatTile label="Live supply" value={market.supply.toFixed(2)} caption="Bonded micro shares" />
        <StatTile
          label="Cap projection"
          value={Math.max(market.maxSupply || 0, market.supply).toLocaleString()}
          caption="Max supply target"
        />
      </div>
    </div>
  );
};

const basePriceLabel = (market: UiMarket) => {
  const price = market.basePrice / 1_000_000;
  return "$" + price.toFixed(2);
};

const StatTile = ({ label, value, caption }: { label: string; value: string; caption: string }) => (
  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
    <p className="text-xs uppercase tracking-[0.35rem] text-white/40">{label}</p>
    <p className="font-display text-2xl text-white">{value}</p>
    <p className="text-xs text-white/50">{caption}</p>
  </div>
);

export default CurvePreview;

