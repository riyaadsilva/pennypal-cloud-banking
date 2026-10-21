import { motion } from "framer-motion";
import { Bike, BookOpen, Gamepad2, Gift, Headphones, Palette, PiggyBank, Plane } from "lucide-react";
import { useMotionOk } from "../hooks/useMotionOk.js";

export const GOAL_ICONS = { jar: PiggyBank, bike: Bike, headphones: Headphones, palette: Palette, plane: Plane, gamepad: Gamepad2, book: BookOpen, gift: Gift };
const COLORS = ["#8B5CF6", "#60A5FA", "#34D399", "#F472B6", "#FB923C", "#FACC15"];

// Illustrated savings jar: the fill rises with progress.
export default function Jar({ pct, icon = "jar", seed = 0, size = 96 }) {
  const ok = useMotionOk();
  const Icon = GOAL_ICONS[icon] || PiggyBank;
  const color = COLORS[seed % COLORS.length];
  const h = 70 * Math.min(100, pct) / 100;
  return (
    <svg viewBox="0 0 100 120" width={size} height={size * 1.2} role="img" aria-label={`Jar ${Math.round(pct)}% full`}>
      <rect x="28" y="6" width="44" height="12" rx="5" fill={color} opacity=".85" />
      <path d="M30 20 h40 q10 6 10 20 v54 q0 14 -14 14 h-32 q-14 0 -14 -14 v-54 q0 -14 10 -20z" fill="#fff" stroke="#CBD5E1" strokeWidth="2.5" />
      <clipPath id={`jc${seed}`}><path d="M30 22 h40 q8 6 8 18 v54 q0 12 -12 12 h-32 q-12 0 -12 -12 v-54 q0 -12 8 -18z" /></clipPath>
      <g clipPath={`url(#jc${seed})`}>
        <motion.rect x="10" width="80" fill={color} opacity=".28" initial={ok ? { y: 108, height: 0 } : false} animate={{ y: 108 - h, height: h }} transition={{ duration: 1, ease: [0.32, 0.72, 0, 1] }} />
        <motion.rect x="10" width="80" height="4" fill={color} opacity=".55" initial={ok ? { y: 108 } : false} animate={{ y: 108 - h }} transition={{ duration: 1, ease: [0.32, 0.72, 0, 1] }} />
      </g>
      <foreignObject x="34" y="46" width="32" height="32"><div className="grid h-8 w-8 place-items-center"><Icon color={color} size={26} strokeWidth={2.2} /></div></foreignObject>
    </svg>
  );
}
