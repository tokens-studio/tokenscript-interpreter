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
        className="appearance-none bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded px-3 py-1 pr-8 text-xs text-gray-700 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        data-testid={testId}
      >
        <option
          value=""
          hidden
        >
          Load preset
        </option>
        {presets.map((preset) => (
          <option
            key={preset.name}
            value={preset.name}
          >
            {preset.name}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-4 text-gray-500 mt-[2px]"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.585l3.71-3.354a.75.75 0 111.02 1.1l-4.25 3.85a.75.75 0 01-1.02 0l-4.25-3.85a.75.75 0 01.02-1.06z" clipRule="evenodd" />
      </svg>

    </div>
  );
}

export default PresetSelector;
