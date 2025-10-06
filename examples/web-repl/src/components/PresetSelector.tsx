import { JSON_PRESETS, type Preset, TOKENSCRIPT_PRESETS } from "../utils/presets";
import { ArrowDown } from "./icons";

interface PresetSelectorProps {
  inputMode: "tokenscript" | "json";
  onPresetSelect: (preset: Preset) => void;
  testId?: string;
}

function PresetSelector({ inputMode, onPresetSelect, testId }: PresetSelectorProps) {
  const presets = inputMode === "tokenscript" ? TOKENSCRIPT_PRESETS : JSON_PRESETS;

  const handlePresetChange = (presetName: string) => {
    if (presetName === "") return;

    const preset = presets.find((p) => p.name === presetName);
    if (preset) {
      onPresetSelect(preset);
    }
  };

  return (
    <div className="relative flex items-center h-full">
      <select
        value=""
        onChange={(e) => handlePresetChange(e.target.value)}
        className="h-full appearance-none text-xs sm:text-sm text-gray-600 font-mono bg-transparent border-none outline-none truncate cursor-pointer pr-6"
        data-testid={testId}
      >
        <option value="">Load preset...</option>
        {presets.map((preset) => (
          <option
            key={preset.name}
            value={preset.name}
          >
            {preset.name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-0">
        <ArrowDown />
      </span>
    </div>
  );
}

export default PresetSelector;
