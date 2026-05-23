import { useEffect, useState } from "react";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function handleResize() {
      clearTimeout(timer);
      timer = setTimeout(() => setIsMobile(window.innerWidth < 768), 150);
    }
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, []);

  return isMobile;
}
