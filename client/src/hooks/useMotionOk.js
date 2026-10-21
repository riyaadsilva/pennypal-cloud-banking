import { useReducedMotion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
// Animations run only if the user has them on AND the OS does not ask for reduced motion.
export function useMotionOk() {
  const reduced = useReducedMotion();
  const auth = useAuth();
  return !reduced && (auth?.user ? auth.user.animationsOn : true);
}
