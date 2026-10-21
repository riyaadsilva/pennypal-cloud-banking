// PennyPal design tokens: brief palette with Apple-style restraint (see docs/design.md)
export default {
  colors: { lavender: "#8B5CF6", sky: "#60A5FA", sun: "#FACC15", mint: "#34D399", paper: "#FAFAF7", ink: "#1E293B", blush: "#FBCFE8", peach: "#FED7AA" },
  fontFamily: { display: ["Fredoka", "system-ui", "sans-serif"], body: ["Inter", "system-ui", "sans-serif"] },
  borderRadius: { card: "28px", control: "16px", chip: "999px" }, // concentric: inner = outer - padding
  boxShadow: { lift: "0 1px 2px rgba(30,41,59,.06), 0 12px 32px -12px rgba(30,41,59,.18)" },
  transitionTimingFunction: { spring: "cubic-bezier(.32,.72,0,1)" },
};
