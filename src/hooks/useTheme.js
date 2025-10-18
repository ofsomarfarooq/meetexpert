import { useEffect, useState } from "react";

export function useTheme(defaultTheme = "business") {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || defaultTheme
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === "business" ? "light" : "business"));

  return { theme, toggleTheme };
}
