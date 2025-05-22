import { copy, ensureDir, existsSync } from "fs";
import { join, resolve } from "path";
import vento from "vento";
import { getPageData, navData } from "./pages.ts";
import * as log from "./utils/log.ts";
import { transformCSS } from "./utils/postcss.ts";
import { processFiles } from "./utils/files.ts";
import postcss from "postcss";

log.debug("Started - validating environment.");
log.debug("Arguments:", Deno.args);

if (Deno.args.length !== 1) {
  throw new Error(
    "Invalid argument list! Please supply exactly one - the path to the project root.",
  );
}

const PROJECT_ROOT = resolve(Deno.cwd(), Deno.args[0]);
log.debug(`Resolved build path: ${PROJECT_ROOT}`);

if (!existsSync(PROJECT_ROOT, { isDirectory: true })) {
  throw new Error(`Specified project root \"${PROJECT_ROOT}\" does not exist!`);
}

const REQUIRED_DIRECTORIES = {
  vento: join(PROJECT_ROOT, "vento"),
  assets: join(PROJECT_ROOT, "assets"),
  img: join(PROJECT_ROOT, "assets/img"),
  css: join(PROJECT_ROOT, "assets/css"),
  serve: join(PROJECT_ROOT, "serve"),
  logs: join(PROJECT_ROOT, "logs"),
};

if (existsSync(REQUIRED_DIRECTORIES.serve)) {
  Deno.removeSync(REQUIRED_DIRECTORIES.serve, { recursive: true });
  log.info("Removed output directory.");
}

if (existsSync(REQUIRED_DIRECTORIES.logs)) {
  Deno.removeSync(REQUIRED_DIRECTORIES.logs, { recursive: true });
  log.info("Removed CSS logs directory.");
}

await Promise.all(
  Object.values(REQUIRED_DIRECTORIES).map((dir) => ensureDir(dir)),
);

log.debug("Required directories created.");

const ASSETS_OUTPUT = join(REQUIRED_DIRECTORIES.serve, "assets");
const CSS_OUTPUT = join(ASSETS_OUTPUT, "css");

try {
  await copy(REQUIRED_DIRECTORIES.assets, ASSETS_OUTPUT);
  log.info("Assets copied successfully.");

  Deno.removeSync(CSS_OUTPUT, { recursive: true });
  log.info("CSS files removed from assets - will be compiled and optimised.");
} catch (err) {
  log.error("An error occurred while copying assets.");
  throw err;
}

async function compileCSS(): Promise<void> {
  log.info("Compiling CSS...");

  const warnings: postcss.Warning[] = [];
  const diuWarnings: unknown[] = [];
  const messages: postcss.Message[] = [];

  await processFiles(
    REQUIRED_DIRECTORIES.css,
    CSS_OUTPUT,
    ".css",
    async ({ inputPath, outputPath, contents }) => {
      log.info(`Compiling CSS file ${inputPath} into ${outputPath}`);

      const result = await transformCSS(contents, inputPath);

      warnings.push(...result.warnings);
      diuWarnings.push(...result.diuWarnings);
      messages.push(...result.messages);

      return result.output;
    },
  );

  log.info("CSS compilation completed. Saving warnings and messages to logs directory.");
  Promise.all([
    Deno.writeTextFile(
      join(REQUIRED_DIRECTORIES.logs, "warnings.log"),
      warnings.map((w) => w.toString()).join("\n"),
    ),
    Deno.writeTextFile(
      join(REQUIRED_DIRECTORIES.logs, "doiuse.log"),
      diuWarnings.map((w) => JSON.stringify(w)).join("\n"),
    ),
    Deno.writeTextFile(
      join(REQUIRED_DIRECTORIES.logs, "messages.log"),
      messages.map((m) => m.toString()).join("\n"),
    ),
    Deno.writeTextFile(
      join(REQUIRED_DIRECTORIES.logs, "warnings.log.jsonish"),
      warnings.map((w) => Deno.inspect(w)).join("\n"),
    ),
    Deno.writeTextFile(
      join(REQUIRED_DIRECTORIES.logs, "doiuse.log.jsonish"),
      diuWarnings.map((w) => Deno.inspect(w)).join("\n"),
    ),
    Deno.writeTextFile(
      join(REQUIRED_DIRECTORIES.logs, "messages.log.jsonish"),
      messages.map((m) => Deno.inspect(m)).join("\n"),
    ),
  ]).then(() => log.debug("CSS compilation warnings and messages saved."));
}

async function compilePages(): Promise<void> {
  const renderer = vento({
    autoDataVarname: true,
    autoescape: false,
    dataVarname: "it",
    includes: REQUIRED_DIRECTORIES.vento,
  });

  const pages = getPageData();

  log.info("Compiling Pages...");

  await processFiles(
    REQUIRED_DIRECTORIES.vento,
    REQUIRED_DIRECTORIES.serve,
    ".html",
    async ({ inputPath, outputPath, contents }) => {
      const page = pages.find((p) =>
        join(REQUIRED_DIRECTORIES.vento, p.filepath) === inputPath
      );

      if (!page) return;

      log.info(`Compiling page template ${inputPath} into ${outputPath}`);

      return (await renderer.runString(
        contents,
        { pages, navData, currentPage: page },
        inputPath,
      )).content;
    },
  );

  log.info("Page compilation completed.");
}

try {
  await Promise.all([compileCSS(), compilePages()]);
  log.info("Build process completed successfully.");
} catch (err) {
  log.error("Build process failed.");
  throw err;
}
