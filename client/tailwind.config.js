import tokens from "./tailwind.tokens.js";
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: tokens },
};
