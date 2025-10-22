import { useCallback, useRef, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { getTheme } from "../theme/colors";
import { HEADER_HEIGHT } from "./shared-theme";
import type { Preset } from "../utils/presets";

interface EditorTitleBarProps {
  inputMode: "tokenscript" | "json";
  onInputModeChange: (mode: "tokenscript" | "json") => void;
  allPresets: Preset[];
  onPresetSelect: (preset: Preset) => void;
  currentPresetName: string | null;
}

const INPUT_MODE_OPTIONS = [
  { value: "tokenscript", label: "TokenScript" },
  { value: "json", label: "JSON" },
];

function EditorTitleBar({
  inputMode,
  onInputModeChange,
  allPresets,
  onPresetSelect,
  currentPresetName,
}: EditorTitleBarProps) {
  const { theme } = useTheme();
  const currentTheme = getTheme(theme);
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const presetButtonRef = useRef<HTMLButtonElement>(null);

  const handlePresetSelect = useCallback(
    (preset: Preset) => {
      onPresetSelect(preset);
      setIsPresetOpen(false);
    },
    [onPresetSelect],
  );

  // Group presets by type
  const tokenscriptPresets = allPresets.filter((p) => p.type === "code");
  const jsonPresets = allPresets.filter((p) => p.type === "json");

  return (
    <div
      className="flex items-center justify-between px-4 border-b"
      style={{
        backgroundColor: currentTheme.surface,
        borderColor: currentTheme.border,
        height: HEADER_HEIGHT,
      }}
    >
      {/* Left: Preset selector */}
      <div className="relative">
        <button
          ref={presetButtonRef}
          type="button"
          onClick={() => setIsPresetOpen(!isPresetOpen)}
          className="px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-2"
          style={{
            backgroundColor: currentTheme.background,
            color: currentTheme.textMuted,
            border: `1px solid ${currentTheme.border}`,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = currentTheme.textSecondary)}
          onMouseLeave={(e) => (e.currentTarget.style.color = currentTheme.textMuted)}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>{currentPresetName || "Preset"}</span>
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Preset Dropdown */}
        {isPresetOpen && (
          <div
            className="absolute top-full left-0 mt-1 rounded border shadow-lg z-10 min-w-max max-h-96 overflow-y-auto"
            style={{
              backgroundColor: currentTheme.surface,
              borderColor: currentTheme.border,
            }}
          >
            {/* TokenScript Presets Group */}
            {tokenscriptPresets.length > 0 && (
              <>
                <div
                  className="px-4 py-2 text-xs font-semibold sticky top-0"
                  style={{
                    backgroundColor: currentTheme.background,
                    borderBottom: `1px solid ${currentTheme.border}`,
                    color: currentTheme.textMuted,
                  }}
                >
                  TokenScript
                </div>
                {tokenscriptPresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className="block w-full text-left px-4 py-2 text-sm transition-colors"
                    style={{
                      color: currentTheme.textPrimary,
                      backgroundColor: "transparent",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = currentTheme.background)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    {preset.name}
                  </button>
                ))}
              </>
            )}

            {/* JSON Presets Group */}
            {jsonPresets.length > 0 && (
              <>
                <div
                  className="px-4 py-2 text-xs font-semibold sticky top-0"
                  style={{
                    backgroundColor: currentTheme.background,
                    borderTop: `1px solid ${currentTheme.border}`,
                    borderBottom: `1px solid ${currentTheme.border}`,
                    color: currentTheme.textMuted,
                  }}
                >
                  JSON
                </div>
                {jsonPresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className="block w-full text-left px-4 py-2 text-sm transition-colors"
                    style={{
                      color: currentTheme.textPrimary,
                      backgroundColor: "transparent",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = currentTheme.background)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    {preset.name}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: Mode Switch */}
      <div className="flex items-center gap-1 px-3 py-1 rounded"
        style={{
          backgroundColor: currentTheme.background,
          border: `1px solid ${currentTheme.border}`,
        }}
      >
        {INPUT_MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onInputModeChange(option.value as "tokenscript" | "json")}
            className="px-2 py-1 rounded text-xs font-medium transition-colors"
            style={{
              backgroundColor:
                inputMode === option.value
                  ? currentTheme.background
                  : "transparent",
              color:
                inputMode === option.value
                  ? currentTheme.textPrimary
                  : currentTheme.textMuted,
              border:
                inputMode === option.value
                  ? `1px solid ${currentTheme.border}`
                  : "1px solid transparent",
            }}
            onMouseEnter={(e) => {
              if (inputMode !== option.value) {
                e.currentTarget.style.color = currentTheme.textSecondary;
              }
            }}
            onMouseLeave={(e) => {
              if (inputMode !== option.value) {
                e.currentTarget.style.color = currentTheme.textMuted;
              }
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default EditorTitleBar;
