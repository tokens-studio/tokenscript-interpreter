import { Moon, Sun } from "./icons";
import { useTheme } from "../contexts/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? <Moon /> : <Sun />}
    </button>
  );
}
