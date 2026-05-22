import { Building2, MapPinned } from "lucide-react";

import { AdminPage } from "./pages/AdminPage";
import { HomePage } from "./pages/HomePage";

export function App() {
  const isAdmin = window.location.pathname.startsWith("/admin");

  return (
    <>
      <nav className="fixed left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-white/70 bg-white/95 p-1 shadow-panel backdrop-blur">
        <a className={`nav-link ${!isAdmin ? "nav-link-active" : ""}`} href="/" title="Map discovery">
          <MapPinned className="h-4 w-4" />
          Map
        </a>
        <a className={`nav-link ${isAdmin ? "nav-link-active" : ""}`} href="/admin" title="Admin listings">
          <Building2 className="h-4 w-4" />
          Admin
        </a>
      </nav>
      {isAdmin ? <AdminPage /> : <HomePage />}
    </>
  );
}
