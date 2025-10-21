import type {
  ColorSpecification,
  FunctionSpecification,
} from "@tokens-studio/tokenscript-interpreter";
import { useAtom } from "jotai";
import { useCallback, useState } from "react";
import { colorSchemasAtom, functionSchemasAtom } from "../store/atoms";
import { JSON_PRESETS, type Preset, TOKENSCRIPT_PRESETS } from "../utils/presets";
import { fetchTokenScriptSchema } from "../utils/schema-fetcher";
import TitleBarComboBox from "./TitleBarComboBox";

interface PresetSelectorProps {
  inputMode: "tokenscript" | "json";
  onPresetSelect: (preset: Preset) => void;
  testId?: string;
}

function PresetSelector({ inputMode, onPresetSelect, testId }: PresetSelectorProps) {
  const presets = inputMode === "tokenscript" ? TOKENSCRIPT_PRESETS : JSON_PRESETS;
  const [colorSchemas, setColorSchemas] = useAtom(colorSchemasAtom);
  const [functionSchemas, setFunctionSchemas] = useAtom(functionSchemasAtom);
  const [selectedPreset, setSelectedPreset] = useState("");

  const loadDependencies = useCallback(
    async (dependencies: string[]) => {
      const visited = new Set<string>();
      const colorSchemasToAdd = new Map<string, ColorSpecification>();
      const functionSchemasToAdd = new Map<string, FunctionSpecification>();

      const fetchDependency = async (url: string): Promise<void> => {
        // Avoid infinite loops and duplicate loading
        if (visited.has(url) || colorSchemas.has(url) || functionSchemas.has(url)) {
          return;
        }

        visited.add(url);

        try {
          const response = await fetchTokenScriptSchema(url);
          const spec = response.content;

          // Collect schema for later addition
          if (spec.type === "function") {
            functionSchemasToAdd.set(url, spec as FunctionSpecification);
          } else {
            colorSchemasToAdd.set(url, spec as ColorSpecification);
          }

          // Recursively load requirements if they exist
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
          throw error; // Re-throw to prevent partial loading
        }
      };

      // Fetch all dependencies recursively
      const fetchPromises = dependencies.map((url) => fetchDependency(url));
      await Promise.all(fetchPromises);

      // Add all schemas at once after successful fetching
      if (colorSchemasToAdd.size > 0) {
        setColorSchemas((current) => {
          const updated = new Map(current);
          colorSchemasToAdd.forEach((spec, url) => {
            updated.set(url, spec);
          });
          return updated;
        });
      }

      if (functionSchemasToAdd.size > 0) {
        setFunctionSchemas((current) => {
          const updated = new Map(current);
          functionSchemasToAdd.forEach((spec, url) => {
            updated.set(url, spec);
          });
          return updated;
        });
      }
    },
    [colorSchemas, functionSchemas, setColorSchemas, setFunctionSchemas],
  );

  const handlePresetChange = useCallback(
    async (presetName: string) => {
      if (presetName === "") return;

      const preset = presets.find((p) => p.name === presetName);
      if (preset) {
        if (preset.clearDependencies) {
          setColorSchemas(new Map());
          setFunctionSchemas(new Map());
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
    [presets, loadDependencies, onPresetSelect, setColorSchemas, setFunctionSchemas],
  );

  const options = [{ value: "", label: "Load preset" }, ...presets.map((preset) => ({
    value: preset.name,
    label: preset.name,
  }))];

  return (
    <TitleBarComboBox
      value={selectedPreset}
      onChange={handlePresetChange}
      options={options}
      placeholder="Load preset"
      testId={testId}
    />
  );
}

export default PresetSelector;
