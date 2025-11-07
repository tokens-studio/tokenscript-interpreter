import type { Stats } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import * as yauzl from "yauzl";

enum FileType {
  ZIP = "ZIP",
  JSON = "JSON",
  DIRECTORY = "DIRECTORY",
}

function parseJson(content: string, fileName: string): unknown {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to parse JSON in file '${fileName}': ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function removeJsonExtension(fileName: string): string {
  return fileName.replace(/\.json$/i, "");
}

async function loadZipToMemory(zipPath: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const filesContent: Record<string, unknown> = {};

    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(new Error(`Failed to open ZIP file: ${err.message}`));
        return;
      }

      if (!zipfile) {
        reject(new Error("Failed to open ZIP file"));
        return;
      }

      zipfile.readEntry();

      zipfile.on("entry", (entry) => {
        if (entry.fileName.endsWith("/")) {
          zipfile.readEntry();
          return;
        }

        if (entry.fileName.endsWith(".json")) {
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              reject(new Error(`Failed to read entry ${entry.fileName}: ${err.message}`));
              return;
            }

            if (!readStream) {
              reject(new Error(`Failed to read entry ${entry.fileName}`));
              return;
            }

            let data = "";
            readStream.on("data", (chunk) => {
              data += chunk;
            });

            readStream.on("end", () => {
              try {
                const fileNameWithoutExt = removeJsonExtension(entry.fileName);
                filesContent[fileNameWithoutExt] = parseJson(data, entry.fileName);
                zipfile.readEntry();
              } catch (error) {
                reject(error);
              }
            });

            readStream.on("error", (streamErr) => {
              reject(new Error(`Error reading stream for ${entry.fileName}: ${streamErr.message}`));
            });
          });
        } else {
          zipfile.readEntry();
        }
      });

      zipfile.on("end", () => {
        resolve(filesContent);
      });

      zipfile.on("error", (zipErr) => {
        reject(new Error(`ZIP file error: ${zipErr.message}`));
      });
    });
  });
}

function detectFileType(filePath: string, stats: Stats): FileType {
  if (stats.isDirectory()) {
    return FileType.DIRECTORY;
  }

  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".zip") return FileType.ZIP;
  if (ext === ".json") return FileType.JSON;

  throw new Error(`Unsupported file type: ${ext}`);
}

/**
 * Collects JSON files from a given path (file, directory, or ZIP archive).
 * Returns a record where keys are file names without the .json extension.
 *
 * @param filePath - Path to a JSON file, directory containing JSON files, or ZIP archive
 * @returns Record mapping file names (without extension) to their parsed JSON content
 * @throws Error if the file type is unsupported or if JSON parsing fails
 */
export async function collectJsonFiles(filePath: string): Promise<Record<string, unknown>> {
  const fileStats = await fs.stat(filePath);
  const fileType = detectFileType(filePath, fileStats);

  switch (fileType) {
    case FileType.ZIP: {
      const filesContent = await loadZipToMemory(filePath);
      return filesContent;
    }

    case FileType.JSON: {
      const content = await fs.readFile(filePath, "utf-8");
      const fileName = path.basename(filePath);
      const fileNameWithoutExt = removeJsonExtension(fileName);
      const parsed = parseJson(content, fileName);
      return { [fileNameWithoutExt]: parsed };
    }

    case FileType.DIRECTORY: {
      const files = await fs.readdir(filePath);
      const jsonFiles: Record<string, unknown> = {};

      for (const file of files) {
        if (path.extname(file).toLowerCase() === ".json") {
          const fullPath = path.join(filePath, file);
          const content = await fs.readFile(fullPath, "utf-8");
          const parsed = parseJson(content, file);
          const fileNameWithoutExt = removeJsonExtension(file);
          jsonFiles[fileNameWithoutExt] = parsed;
        }
      }

      return jsonFiles;
    }
  }
}
