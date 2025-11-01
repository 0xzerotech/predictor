import { motion } from "framer-motion";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

interface HeroProps {
  totalVolume: number;
  discovery: number;
  bonded: number;
  attentionFlow: number;
}

export const Hero = ({ totalVolume, discovery, bonded, attentionFlow }: HeroProps) => {
  const metrics = [
    {
      label: "Total Volume",
      value: `$${(totalVolume / 1_000_000).toFixed(2)}M`,
    },
    {
      label: "Discovery Markets",
      value: discovery.toString().padStart(2, "0"),
    },
    {
      label: "Bonded Markets",
      value: bonded.toString().padStart(2, "0"),
    },
    {
      label: "Attention Flux",
      value: `${(attentionFlow / 1_000).toFixed(1)}k`,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[48px] border border-white/10 bg-white/5 p-12 shadow-[0_45px_120px_rgba(4,0,15,0.45)]">
      <div className="absolute inset-0 animate-flow bg-gradient-to-br from-plasma/30 via-aurora/20 to-neon/30 blur-3xl" />
      <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-6">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm font-medium text-neon"
          >
            Hyper Aesthetic Solana Prediction Flywheel
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="font-display text-5xl leading-tight tracking-tight text-white sm:text-6xl"
          >
            Bonding-Curve Markets That Mint Truth From Pure Hype
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-lg text-white/75"
          >
            Every trade crescendos liquidity, feeds the attention token, and accelerates discovery. When the crowd belief
            coheres, the market bonds into objective resolution with on-chain receipts.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-wrap items-center gap-4"
          >
            <a
              href="#markets"
              className="glass-button bg-gradient-to-r from-plasma/60 via-aurora/60 to-neon/60 text-sm font-semibold text-white"
            >
              Explore the Hype Field
            </a>
            <WalletMultiButton className="glass-button !px-5 !py-2 text-sm" />
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="grid grid-cols-2 gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
        >
          {metrics.map((metric, idx) => (
            <div key={metric.label} className="flex flex-col gap-1">
              <span className="text-sm uppercase tracking-wider text-white/50">{metric.label}</span>
              <motion.span
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + idx * 0.05, duration: 0.5 }}
                className="font-display text-3xl text-white"
              >
                {metric.value}
              </motion.span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

