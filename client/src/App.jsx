import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { FxProvider } from "./components/Fx.jsx";
import Layout from "./components/Layout.jsx";
import Penny from "./components/Penny.jsx";
import Landing from "./pages/Landing.jsx";
import Auth from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Banking from "./pages/Banking.jsx";
import Savings from "./pages/Savings.jsx";
import Budget from "./pages/Budget.jsx";
import Quiz from "./pages/Quiz.jsx";
import Achievements from "./pages/Achievements.jsx";
import Profile from "./pages/Profile.jsx";
import Admin from "./pages/Admin.jsx";

function Protected({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center"><Penny mood="think" size={120} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  return children;
}
const Guest = ({ children }) => { const { user, loading } = useAuth(); return !loading && user ? <Navigate to="/dashboard" replace /> : children; };

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Guest><Auth mode="login" /></Guest>} />
      <Route path="/register" element={<Guest><Auth mode="register" /></Guest>} />
      <Route element={<Protected><FxProvider><Layout /></FxProvider></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/bank" element={<Banking />} />
        <Route path="/goals" element={<Savings />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/learn" element={<Quiz />} />
        <Route path="/rewards" element={<Achievements />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Protected role="admin"><Admin /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
