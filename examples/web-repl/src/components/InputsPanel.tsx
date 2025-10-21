import { useAtom } from "jotai";
import type React from "react";
import { useCallback, useEffect } from "react";
import { type InputDefinition, inputsDataAtom } from "../store/atoms";
import Select from "./Select";

const TYPE_OPTIONS = [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "color", label: "Color" },
];

interface InputsPanelProps {
  onInputsChange?: (inputs: Record<string, any>) => void;
  initialInputs?: InputDefinition[];
}

const InputsPanel: React.FC<InputsPanelProps> = ({ onInputsChange, initialInputs = [] }) => {
  const [inputs, setInputs] = useAtom(inputsDataAtom);

  // Initialize from initialInputs if provided (only on first mount)
  useEffect(() => {
    if (initialInputs.length > 0) {
      setInputs(initialInputs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync inputs changes with parent component
  useEffect(() => {
    const inputRecord = inputs.reduce(
      (acc, input) => {
        acc[input.name] = input.value;
        return acc;
      },
      {} as Record<string, any>,
    );

    onInputsChange?.(inputRecord);
  }, [inputs, onInputsChange]);

  const handleNameChange = useCallback(
    (index: number, name: string) => {
      const newInputs = [...inputs];
      newInputs[index] = { ...newInputs[index], name };
      setInputs(newInputs);
    },
    [inputs],
  );

  const handleTypeChange = useCallback(
    (index: number, type: InputDefinition["type"]) => {
      const newInputs = [...inputs];
      // Reset value based on type
      const newValue =
        type === "string" ? "" : type === "number" ? 0 : type === "boolean" ? false : "#000000";

      newInputs[index] = {
        ...newInputs[index],
        type,
        value: newValue,
      };
      setInputs(newInputs);
    },
    [inputs],
  );

  const handleValueChange = useCallback(
    (index: number, value: string | number | boolean) => {
      const newInputs = [...inputs];
      newInputs[index] = { ...newInputs[index], value };
      setInputs(newInputs);
    },
    [inputs],
  );

  const addInput = () => {
    const newInputName = `input${inputs.length + 1}`;
    setInputs((prevInputs) => [...prevInputs, { name: newInputName, type: "string", value: "" }]);
  };

  const removeInput = useCallback(
    (index: number) => {
      const newInputs = inputs.filter((_, i) => i !== index);
      setInputs(newInputs);
    },
    [inputs],
  );

  const renderInputField = (input: InputDefinition, index: number) => {
    switch (input.type) {
      case "string":
        return (
          <input
            type="text"
            value={input.value as string}
            onChange={(e) => handleValueChange(index, e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-zinc-700 bg-zinc-800/50 text-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent placeholder-zinc-500"
            placeholder={`Enter ${input.name}`}
          />
        );
      case "number":
        return (
          <input
            type="number"
            value={input.value as number}
            onChange={(e) => handleValueChange(index, Number(e.target.value))}
            className="w-full px-2 py-1.5 text-xs border border-zinc-700 bg-zinc-800/50 text-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent placeholder-zinc-500"
            placeholder={`Enter ${input.name}`}
          />
        );
      case "boolean":
        return (
          <Select
            value={String(input.value)}
            onChange={(value) => handleValueChange(index, value === "true")}
            options={[
              { value: "true", label: "True" },
              { value: "false", label: "False" },
            ]}
            className="w-full"
          />
        );
      case "color":
        return (
          <input
            type="color"
            value={input.value as string}
            onChange={(e) => handleValueChange(index, e.target.value)}
            className="w-full h-8 px-1 py-1 border border-zinc-700 bg-zinc-800/50 rounded-md cursor-pointer"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-zinc-900/20 p-3 rounded-lg border border-zinc-800">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-zinc-300">Inputs</h3>
        <button
          type="button"
          onClick={addInput}
          className="text-xs bg-zinc-100 text-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-200 transition-colors shadow-sm font-medium"
        >
          + Add Input
        </button>
      </div>
      <div className={"space-y-2"}>
        {inputs.map((input, index) => (
          <div
            key={index}
            className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 items-center"
          >
            <input
              type="text"
              value={input.name}
              onChange={(e) => handleNameChange(index, e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-zinc-700 bg-zinc-800/50 text-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent placeholder-zinc-500"
              placeholder="Input name"
            />
            <Select
              value={input.type}
              onChange={(value) => handleTypeChange(index, value as InputDefinition["type"])}
              options={TYPE_OPTIONS}
              className="w-full"
            />
            <div>{renderInputField(input, index)}</div>
            <button
              type="button"
              onClick={() => removeInput(index)}
              className="text-xs bg-red-600/80 text-white px-2 py-1.5 rounded-md hover:bg-red-700 transition-colors"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InputsPanel;
