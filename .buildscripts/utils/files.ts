import { ensureDir, walk } from "fs";
import { dirname, join } from "path";
import * as log from "./log.ts";
import { stripExtension } from "./path.ts";
import { PromiseCollection } from "./promises.ts";

export async function processFiles(
  inputDir: string,
  outputDir: string,
  outputExtension: string,
  processFile: (
    data: { inputPath: string; outputPath: string; content: string },
  ) => Promise<string | undefined>,
) {
  const tasks = new PromiseCollection("parallel");

  for await (const file of walk(inputDir, { includeSymlinks: false, includeDirs: false })) {
    const destination = join(
      outputDir,
      stripExtension(file.path.substring(inputDir.length), outputExtension),
    );

    await ensureDir(dirname(destination));

    tasks.add(async () => {
      try {
        const result = await processFile({
          inputPath: file.path,
          outputPath: destination,
          content: await Deno.readTextFile(file.path),
        });

        if (result !== undefined) {
          await Deno.writeTextFile(destination, result, { createNew: true });
        }
      } catch (err: unknown) {
        log.error(`Error processing file: ${file.path}`);
        throw err;
      }
    });
  }

  await tasks.execute();
}
