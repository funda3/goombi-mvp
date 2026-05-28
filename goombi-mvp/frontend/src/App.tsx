import { AdminPage } from "./pages/AdminPage";
import { AdminCRMPage } from "./pages/AdminCRMPage";
import { HomePage } from "./pages/HomePage";

export function App() {
  const isCrm = window.location.pathname.startsWith("/admin/crm");
  const isAdmin = window.location.pathname.startsWith("/admin");
  if (isCrm) return <AdminCRMPage />;
  return isAdmin ? <AdminPage /> : <HomePage />;
}
