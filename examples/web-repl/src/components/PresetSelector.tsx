import type {
  ColorSpecification,
  FunctionSpecification,
} from "@tokens-studio/tokenscript-interpreter";
import { useAtom } from "jotai";
import { useCallback, useState } from "react";
import { appStateAtom } from "../store/atoms";
import { JSON_PRESETS, type Preset, TOKENSCRIPT_PRESETS } from "../utils/presets";
import { fetchTokenScriptSchema } from "../utils/schema-fetcher";
import CleanSelect from "./CleanSelect";

interface PresetSelectorProps {
  inputMode: "tokenscript" | "json";
  onPresetSelect: (preset: Preset) => void;
  testId?: string;
}

function PresetSelector({ inputMode, onPresetSelect, testId }: PresetSelectorProps) {
  const presets = inputMode === "tokenscript" ? TOKENSCRIPT_PRESETS : JSON_PRESETS;
  const [appState, setAppState] = useAtom(appStateAtom);
  const [selectedPreset, setSelectedPreset] = useState("");

  const colorSchemas = appState.colorSchemas;
  const functionSchemas = appState.functionSchemas;

  const loadDependencies = useCallback(
    async (dependencies: string[]) => {
      const visited = new Set<string>();
      const colorSchemasToAdd = new Map<string, ColorSpecification>();
      const functionSchemasToAdd = new Map<string, FunctionSpecification>();

      const fetchDependency = async (url: string): Promise<void> => {
        if (visited.has(url) || colorSchemas.has(url) || functionSchemas.has(url)) {
          return;
        }

        visited.add(url);

        try {
          const response = await fetchTokenScriptSchema(url);
          const spec = response.content;

          if (spec.type === "function") {
            functionSchemasToAdd.set(url, spec as FunctionSpecification);
          } else {
            colorSchemasToAdd.set(url, spec as ColorSpecification);
          }

          if (
            spec.requirements &&
            Array.isArray(spec.requirements) &&
            spec.requirements.length > 0
          ) {
            const requirementPromises = spec.requirements.map((reqUrl) => fetchDependency(reqUrl));
            await Promise.all(requirementPromises);
          }
        } catch (error) {
          console.error(`Failed to load dependency ${url}:`, error);
          throw error;
        }
      };

      const fetchPromises = dependencies.map((url) => fetchDependency(url));
      await Promise.all(fetchPromises);

      if (colorSchemasToAdd.size > 0 || functionSchemasToAdd.size > 0) {
        setAppState((prev) => ({
          ...prev,
          colorSchemas: new Map([...prev.colorSchemas, ...colorSchemasToAdd]),
          functionSchemas: new Map([...prev.functionSchemas, ...functionSchemasToAdd]),
        }));
      }
    },
    [colorSchemas, functionSchemas, setAppState],
  );

  const handlePresetChange = useCallback(
    async (presetName: string) => {
      if (presetName === "") return;

      const preset = presets.find((p) => p.name === presetName);
      if (preset) {
        if (preset.clearDependencies) {
          setAppState((prev) => ({
            ...prev,
            colorSchemas: new Map(),
            functionSchemas: new Map(),
          }));
        }

        // Load dependencies before selecting the preset
        if (preset.dependencies && preset.dependencies.length > 0) {
          await loadDependencies(preset.dependencies);
        }

        onPresetSelect(preset);
        setSelectedPreset(presetName);

        // Reset after a short delay
        setTimeout(() => setSelectedPreset(""), 100);
      }
    },
    [presets, loadDependencies, onPresetSelect, setAppState],
  );

  // Only show actual preset options (no placeholder in dropdown)
  const options = presets.map((preset) => ({
    value: preset.name,
    label: preset.name,
  }));

  return (
    <CleanSelect
      value={selectedPreset}
      onChange={handlePresetChange}
      options={options}
      placeholder="Load preset"
      testId={testId}
    />
  );
}

export default PresetSelector;
