import { AdminPage } from "./pages/AdminPage";
import { HomePage } from "./pages/HomePage";

export function App() {
  const isAdmin = window.location.pathname.startsWith("/admin");
  return isAdmin ? <AdminPage /> : <HomePage />;
}
