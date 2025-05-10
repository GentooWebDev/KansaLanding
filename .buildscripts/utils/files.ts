import { ensureDir, walk } from "fs";
import { dirname, join } from "path";
import { stripExtension } from "./path.ts";
import * as log from "./log.ts";

export async function processFiles(
  inputDir: string,
  outputDir: string,
  outputExtension: string,
  processFile: (
    data: { inputPath: string; outputPath: string; contents: string },
  ) => Promise<string | undefined>,
): Promise<void> {
  const tasks = Array<Promise<void>>();

  for await (const file of walk(inputDir, { includeSymlinks: false, includeDirs: false })) {
    const destination = join(
      outputDir,
      stripExtension(file.path.substring(inputDir.length), outputExtension),
    );

    await ensureDir(dirname(destination));

    tasks.push(
      processFile({
        inputPath: file.path,
        outputPath: destination,
        contents: await Deno.readTextFile(file.path),
      }).then((result) =>
        result ? Deno.writeTextFile(destination, result, { createNew: true }) : void 0
      ).catch((err) => {
        log.error(`Error processing file: ${file.path}`);
        throw err;
      }),
    );
  }

  await Promise.all(tasks);
}
