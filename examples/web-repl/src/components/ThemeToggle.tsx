import { Moon, Sun } from "./icons";
import { useTheme } from "../contexts/ThemeContext";
import { getTheme } from "../theme/colors";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const currentTheme = getTheme(theme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="transition-colors pr-4"
      style={{
        color: currentTheme.textMuted,
        borderRight: `1px solid ${currentTheme.border}`,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = currentTheme.textSecondary)}
      onMouseLeave={(e) => (e.currentTarget.style.color = currentTheme.textMuted)}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? <Moon /> : <Sun />}
    </button>
  );
}
