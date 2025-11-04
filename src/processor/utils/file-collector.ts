import fs from "node:fs/promises";
import path from "node:path";
import * as yauzl from "yauzl";

enum FileType {
  ZIP = "ZIP",
  JSON = "JSON",
  DIRECTORY = "DIRECTORY",
}

async function loadZipToMemory(zipPath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const filesContent: string[] = [];

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
              filesContent.push(data);
              zipfile.readEntry();
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

export async function collectJsonFiles(filePath: string): Promise<string[]> {
  const fileStats = await fs.stat(filePath);
  const fileType = detectFileType(filePath, fileStats);


  switch (fileType) {
    case FileType.ZIP: {
      const filesContent = await loadZipToMemory(filePath);
      return filesContent;
    }

    case FileType.JSON: {
      const content = await fs.readFile(filePath, "utf-8");
      return [content];
    }

    case FileType.DIRECTORY: {
      const files = await fs.readdir(filePath);
      const jsonFiles: string[] = [];

      for (const file of files) {
        if (path.extname(file).toLowerCase() === ".json") {
          const fullPath = path.join(filePath, file);
          const content = await fs.readFile(fullPath, "utf-8");
          jsonFiles.push(content);
        }
      }

      return jsonFiles;
    }
  }
}
