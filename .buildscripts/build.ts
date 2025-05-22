import { createStreaming } from "@dprint/formatter";
import { copy, ensureDir, ensureFile, exists } from "fs";
import { dirname, join } from "path";
import vento from "vento";
import { REMOVE_DIRECTORY_KEYS, REQUIRED_DIRECTORIES } from "./directories.config.ts";
import { getPageData, navData } from "./pages.ts";
import { processFiles } from "./utils/files.ts";
import { PROJECT_ROOT } from "./utils/init.ts";
import * as log from "./utils/log.ts";
import { transformCSS } from "./utils/postcss.ts";
import { PromiseCollection } from "./utils/promises.ts";

// Remove directories that need to be deleted before compilation
async function removeDirectories() {
  const removePromises = new PromiseCollection("consecutive");

  for (const key of REMOVE_DIRECTORY_KEYS) {
    const dir = REQUIRED_DIRECTORIES[key];
    removePromises.add(async () => {
      if (await exists(dir)) {
        await Deno.remove(dir, { recursive: true });
        log.info(`Removed ${key} directory.`);
      } else log.info(`${key} directory not present, not removing.`);
    });
  }

  await removePromises.execute();
  log.debug("Clean directory structure ensured.");
}

// Copy static assets to the serve directory (except CSS)
async function copyAssets() {
  try {
    // Copy all assets
    await copy(REQUIRED_DIRECTORIES.assets, REQUIRED_DIRECTORIES.servedAssets);
    log.info("Assets copied successfully.");

    // Remove copied css directory - will be recompiled
    await Deno.remove(REQUIRED_DIRECTORIES.servedCss, { recursive: true });
    log.info("CSS files removed from assets - will be compiled and optimised.");
  } catch (err) {
    log.error("An error occurred while copying assets.");
    throw err;
  }
}

// Compile and optimise CSS files
async function compileCSS() {
  log.info("Preparing to compile CSS...");

  const logPromises = new PromiseCollection("parallel");

  await processFiles(
    REQUIRED_DIRECTORIES.css,
    REQUIRED_DIRECTORIES.servedCss,
    ".css",
    ({ inputPath, outputPath, content }) => {
      log.info(`Compiling CSS file ${inputPath} into ${outputPath}`);

      return transformCSS(content, inputPath, (logCategories) => {
        for (const [category, msgs] of Object.entries(logCategories)) {
          for (const msg of msgs) {
            logPromises.add(async () => {
              const fullPath = join(
                REQUIRED_DIRECTORIES.logs,
                "css",
                category,
                inputPath.substring(REQUIRED_DIRECTORIES.css.length) + ".log",
              );

              await ensureDir(dirname(fullPath));
              await Deno.writeTextFile(
                fullPath,
                msg.toString !== Object.prototype.toString
                  ? msg.toString()
                  : Deno.inspect(msg),
              );
            });
          }
        }
      });
    },
  );

  log.info("CSS compilation completed.");
  logPromises.execute().then(() => log.info("CSS compilation logs saved."));
}

// Compile page templates to HTML
async function compilePages() {
  log.info("Preparing to compile pages...");
  log.info("Obtaining markup formatting plugin...");

  const formatter = createStreaming(
    fetch("https://plugins.dprint.dev/g-plane/markup_fmt-v0.20.0.wasm"),
  ).then((formatter) => {
    //                                i32 limit
    formatter.setConfig({ lineWidth: 2147483647 }, {
      formatComments: true,
      scriptIndent: true,
      styleIndent: true,
      closingTagLineBreakForEmpty: true,
    });

    log.info("Markup formatting plugin downloaded.");
    return formatter;
  });

  const renderer = vento({
    autoDataVarname: true,
    autoescape: false,
    dataVarname: "it",
    includes: REQUIRED_DIRECTORIES.vento,
  });

  const pages = getPageData();

  await processFiles(
    REQUIRED_DIRECTORIES.vento,
    REQUIRED_DIRECTORIES.serve,
    ".html",
    async ({ inputPath, outputPath, content }) => {
      const page = pages.find((p) =>
        join(REQUIRED_DIRECTORIES.vento, p.filepath) === inputPath
      );

      if (!page) return;

      const result = await renderer.runString(
        content,
        { pages, navData, currentPage: page },
        inputPath,
      );

      const errFilePath = join(
        REQUIRED_DIRECTORIES.bad_code,
        inputPath.substring(PROJECT_ROOT.length),
      );

      try {
        return await formatter.then((formatter) => {
          log.info(`Compiling page template ${inputPath} into ${outputPath}`);

          return formatter.formatText({
            filePath: errFilePath,
            fileText: result.content,
          });
        });
      } catch (err: unknown) {
        await ensureFile(errFilePath);
        Deno.writeTextFile(errFilePath, result.content);
        log.error(`Dumped mid-compilation code to ${errFilePath}!`);

        throw err;
      }
    },
  );

  log.info("Page compilation completed.");
}

try {
  await removeDirectories();
  await copyAssets();
  await Promise.all([compileCSS(), compilePages()]);
  log.info("Build process completed successfully.");
} catch (err) {
  log.error("Build process failed.");
  throw err;
}
