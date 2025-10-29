import { useState, useEffect } from "react";
import MonacoHighlighter from "./components/MonacoHighlighter";
import PrismHighlighter from "./components/PrismHighlighter";
import "./App.css";

const SAMPLE_CODE = `// TokenScript Example
// Define colors
variable primary = "#3b82f6";
variable secondary = rgb(239, 68, 68);
variable accent = hsl(142, 76, 36);

// Color manipulation
variable lightPrimary = lighten(primary, 20);
variable darkPrimary = darken(primary, 15);
variable mixedColor = mix(primary, secondary, 50);

// Numbers with units
variable spacing = 16px;
variable fontSize = 1.5rem;
variable rotation = 45deg;
variable opacity = 85%;

// References
variable computedColor = {colors.primary};
variable nestedValue = {theme.colors.accent.value};

// Lists
variable sizes = 8px, 16px, 24px, 32px;
variable breakpointSm = 640px;
variable breakpointMd = 768px;
variable breakpointLg = 1024px;

// Control flow with block delimiters
variable large = false;
if (spacing > 10px) [
  large = true;
] else [
  large = false;
]

// Functions
variable rounded = round_to(3.14159, 2);
variable oklchColor = oklch(0.7, 0.15, 200);

// Type annotations
variable name: String = "TokenScript";
variable count: Number = 42;
variable isActive: Boolean = true;
variable color: Color = "#ff0000";

// Math operations
variable doubled = count * 2;
variable half = spacing / 2;

// Comparisons
variable isLarge = spacing > 10px;
variable isEqual = count == 42;

// Return list
return primary, secondary, spacing, sizes, name;`;

function App() {
  const [monacoCode, setMonacoCode] = useState(SAMPLE_CODE);
  const [prismCode, setPrismCode] = useState(SAMPLE_CODE);
  const [theme, setTheme] = useState<"light" | "dark">(
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1 className="app-title">TokenScript Syntax Highlighting</h1>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
      <div className="editors-grid">
        <div className="editor-section">
          <h2 className="editor-title">Monaco Editor</h2>
          <div className="editor-container">
            <MonacoHighlighter
              value={monacoCode}
              onChange={setMonacoCode}
              theme={theme}
            />
          </div>
        </div>

        <div className="editor-section">
          <h2 className="editor-title">Prism.js</h2>
          <div className="editor-container">
            <PrismHighlighter
              value={prismCode}
              onChange={setPrismCode}
              theme={theme}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
