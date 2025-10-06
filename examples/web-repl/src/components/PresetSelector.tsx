import { JSON_PRESETS, type Preset, TOKENSCRIPT_PRESETS } from "../utils/presets";

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
    <div className="relative">
      <select
        value=""
        onChange={(e) => handlePresetChange(e.target.value)}
        className="appearance-none bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded px-3 py-1 text-xs text-gray-700 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        data-testid={testId}
      >
        <option value="">Load preset</option>
        {presets.map((preset) => (
          <option
            key={preset.name}
            value={preset.name}
          >
            {preset.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default PresetSelector;
