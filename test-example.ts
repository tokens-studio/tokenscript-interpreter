import {
  interpretTokens,
  fetchTokenScriptSchema,
  Config,
  ColorManager,
  FunctionsManager,
} from "./dist/lib/index.js";

async function main() {
  const tokens = {
    "primary-color": {
      $value: "oklch(1, 1, 1)",
      $type: "color",
    },
    "secondary-color": {
      $value: "darken({primary-color}, 0.5)",
      $type: "color",
    },
  };

  // Fetch schemas
  console.log("Fetching schemas...");
  const oklchSchema = await fetchTokenScriptSchema(
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/oklch-color/latest?format=json",
  );
  const darkenSchema = await fetchTokenScriptSchema(
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/relative-darken/0?format=json",
  );
  const rgbaSchema = await fetchTokenScriptSchema(
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/srgb-color/0.0.1?format=json",
  );
  const hslSchema = await fetchTokenScriptSchema(
    "https://schema.tokenscript.dev.gcp.tokens.studio/api/v1/schema/hsl-color/0.0.1?format=json",
  );

  console.log("oklch schema type:", oklchSchema.type);
  console.log("darken schema type:", darkenSchema.type);
  console.log("rgba schema type:", rgbaSchema.type);

  // Create config with fetched schemas
  const colorManager = new ColorManager();
  const functionsManager = new FunctionsManager();

  // Register color specs
  if (oklchSchema.type === "color") {
    colorManager.register(oklchSchema.schema, oklchSchema.content);
  }
  if (rgbaSchema.type === "color") {
    colorManager.register(rgbaSchema.schema, rgbaSchema.content);
  }
  if (rgbaSchema.type === "color") {
    colorManager.register(hslSchema.schema, rgbaSchema.content);
  }

  // Register function specs
  if (darkenSchema.type === "function") {
    functionsManager.register(darkenSchema.schema, darkenSchema.content);
  }

  const config = new Config({
    colorManager,
    functionsManager,
  });

  // Interpret tokens
  console.log("\nInterpreting tokens...");
  const result = interpretTokens(tokens, config);

  console.log("\nResult:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
