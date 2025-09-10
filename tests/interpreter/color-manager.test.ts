import { describe, it, expect } from "vitest";
import { ColorManager } from "../../interpreter/config/managers/color/manager";
import * as fs from "node:fs";
import * as path from "node:path";

describe("ColorManager", () => {
  it("registers and retrieves the RGB color specification", () => {
    const rgbSpecPath = path.join(__dirname, "../../specifications/colors/rgb.json");
    const rgbSpecString = fs.readFileSync(rgbSpecPath, "utf-8");
    const manager = new ColorManager();

    const spec = manager.register(rgbSpecPath, JSON.parse(rgbSpecString));
    expect(spec).toBeDefined();
    expect(spec.name).toBe("RGB");

    const retrieved = manager.getSpec(rgbSpecPath);
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("RGB");
  });
});
