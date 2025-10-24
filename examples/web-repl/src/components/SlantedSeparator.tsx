import { useTheme } from "../contexts/ThemeContext";
import { getTheme } from "../theme/colors";

export default function SlantedSeparator() {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);

  return (
    <div className="flex items-center h-full px-2">
      <div 
        className="transform -skew-x-12 opacity-20"
        style={{
          backgroundColor: currentTheme.textMuted,
          width: "1px",
          height: "calc(100% - 4px)",
        }}
      />
    </div>
  );
}