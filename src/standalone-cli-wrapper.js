// QuickJS wrapper to import std module before the main script
import * as std from "std";

// Make std available globally for the bundled code
globalThis.std = std;

// Now import the actual CLI
import "./standalone-cli.js";
