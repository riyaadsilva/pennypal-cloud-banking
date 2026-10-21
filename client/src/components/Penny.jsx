import { motion } from "framer-motion";
import { useMotionOk } from "../hooks/useMotionOk.js";

// Penny the Piggy. One SVG, six moods: happy, wave, think, celebrate, sleep, oops.
const BODY = "#FBCFE8", DARK = "#F9A8D4", INK = "#1E293B";

export default function Penny({ mood = "happy", size = 140, className = "", label }) {
  const ok = useMotionOk();
  const wave = mood === "wave", cele = mood === "celebrate", sleep = mood === "sleep", think = mood === "think", oops = mood === "oops";
  const bob = ok && !sleep ? (cele ? { y: [0, -22, 0], transition: { repeat: Infinity, duration: 0.7, ease: "easeOut" } } : { y: [0, -4, 0], transition: { repeat: Infinity, duration: 3, ease: "easeInOut" } }) : {};
  return (
    <motion.svg viewBox="0 0 220 190" width={size} height={size * 190 / 220} className={className} role="img" aria-label={label || `Penny the piggy bank, ${mood}`} animate={bob}>
      <ellipse cx="110" cy="178" rx="62" ry="7" fill="#1E293B" opacity=".08" />
      <path d="M62 118 q-22 -4 -26 -22 q16 2 26 12z" fill={DARK} />
      <rect x="82" y="150" width="20" height="26" rx="9" fill={DARK} />
      <rect x="128" y="150" width="20" height="26" rx="9" fill={DARK} />
      <ellipse cx="110" cy="112" rx="68" ry="54" fill={BODY} />
      <ellipse cx="110" cy="130" rx="46" ry="26" fill="#fff" opacity=".35" />
      <path d="M78 66 q-4 -26 12 -34 q8 14 4 36z" fill={DARK} />
      <path d="M142 66 q4 -26 -12 -34 q-8 14 -4 36z" fill={DARK} />
      <rect x="92" y="60" width="36" height="7" rx="3.5" fill="#FACC15" stroke="#CA8A04" strokeWidth="1.5" />
      <motion.g animate={ok && wave ? { rotate: [0, -28, 0, -28, 0] } : {}} transition={{ repeat: Infinity, duration: 1.6 }} style={{ originX: "154px", originY: "130px" }}>
        {wave ? <rect x="150" y="82" width="16" height="42" rx="8" fill={DARK} transform="rotate(-18 158 124)" /> : <rect x="146" y="136" width="18" height="22" rx="9" fill={DARK} />}
      </motion.g>
      <ellipse cx="160" cy="104" rx="26" ry="19" fill={DARK} />
      <ellipse cx="152" cy="104" rx="3.4" ry="5" fill={INK} opacity=".75" />
      <ellipse cx="166" cy="104" rx="3.4" ry="5" fill={INK} opacity=".75" />
      {sleep ? (<><path d="M108 88 q6 5 12 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M134 88 q6 5 12 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" /></>)
        : cele ? (<><path d="M108 92 q6 -8 12 0" stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" /><path d="M134 92 q6 -8 12 0" stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" /></>)
        : (<><circle cx="114" cy="88" r="6" fill="#fff" /><circle cx="140" cy="88" r="6" fill="#fff" /><circle cx={think ? 117 : oops ? 113 : 115} cy={think ? 85 : 89} r="3.4" fill={INK} /><circle cx={think ? 143 : oops ? 139 : 141} cy={think ? 85 : 89} r="3.4" fill={INK} /></>)}
      <circle cx="96" cy="108" r="7" fill="#F472B6" opacity=".45" />
      {oops ? <path d="M138 128 q10 -7 20 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" /> : sleep ? <path d="M140 126 q8 3 16 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" /> : <path d="M138 124 q10 10 20 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />}
      {oops && <path d="M92 76 l12 -4 M146 72 l12 4" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />}
      {think && (<g><circle cx="176" cy="50" r="4" fill="#C4B5FD" /><circle cx="188" cy="36" r="6" fill="#C4B5FD" /><ellipse cx="200" cy="16" rx="16" ry="11" fill="#DDD6FE" /><text x="200" y="21" textAnchor="middle" fontSize="14" fontWeight="700" fill="#6D28D9">?</text></g>)}
      {sleep && (<g fill="#8B5CF6" fontWeight="700" fontFamily="Fredoka"><motion.text x="168" y="56" fontSize="16" animate={ok ? { opacity: [0, 1, 0], y: [60, 46] } : {}} transition={{ repeat: Infinity, duration: 2.4 }}>z</motion.text><motion.text x="182" y="40" fontSize="22" animate={ok ? { opacity: [0, 1, 0], y: [44, 28] } : {}} transition={{ repeat: Infinity, duration: 2.4, delay: 0.8 }}>Z</motion.text></g>)}
      {cele && [[40, 50], [186, 42], [198, 110], [26, 120]].map(([x, y], i) => (
        <motion.path key={i} d={`M${x} ${y - 8} l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4z`} fill="#FACC15" animate={ok ? { scale: [0.6, 1.2, 0.6], opacity: [0.6, 1, 0.6] } : {}} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }} style={{ originX: `${x}px`, originY: `${y}px` }} />
      ))}
    </motion.svg>
  );
}
