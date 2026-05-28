import { useEffect, useState } from "react";

import { AdminPage } from "./pages/AdminPage";
import { AdminCRMPage } from "./pages/AdminCRMPage";
import { HomePage } from "./pages/HomePage";
import { currentAppRoute } from "./utils/routes";

export function App() {
  const [route, setRoute] = useState<string>(() => currentAppRoute());

  useEffect(() => {
    const syncRoute = () => setRoute(currentAppRoute());
    window.addEventListener("hashchange", syncRoute);
    window.addEventListener("popstate", syncRoute);
    return () => {
      window.removeEventListener("hashchange", syncRoute);
      window.removeEventListener("popstate", syncRoute);
    };
  }, []);

  const isCrm = route.startsWith("/admin/crm");
  const isAdmin = route.startsWith("/admin");
  if (isCrm) return <AdminCRMPage />;
  return isAdmin ? <AdminPage /> : <HomePage />;
}
