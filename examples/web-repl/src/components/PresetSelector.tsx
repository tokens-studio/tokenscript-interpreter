import { JSON_PRESETS, type Preset, TOKENSCRIPT_PRESETS } from "../utils/presets";

import Select from "./Select";

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

  const options = presets.map((preset) => ({
    value: preset.name,
    label: preset.name,
  }));

  return (
    <Select
      value=""
      onChange={handlePresetChange}
      options={options}
      placeholder="Load preset"
      showCheckmarks={false}
      testId={testId}
    />
  );
}

export default PresetSelector;
