import { copy, ensureDir, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import vento from "vento";
import { extractBaseName, getPageData, navData } from "./pages.ts";

console.debug("Started - not yet validated environment.");
console.debug("Args:", Deno.args);

const [flags, args] = Deno.args.reduce((acc, arg) => {
  if (arg.startsWith("--")) {
    acc[0].push(arg.substring(2));
  } else {
    acc[1].push(arg);
  }

  return acc;
}, [Array<string>(), Array<string>()]);

console.debug("Parsed Flags:", flags);
console.debug("Parsed Args:", args);

// Check if we have a path supplied
if (args.length !== 1) {
  throw "Invalid argument list! Please supply exactly one - the path to the build root.";
}

if (flags.length > 1 || (flags.length === 1 && flags[0] !== "cautious")) {
  throw "Invalid flags! Only one is valid: --cautious.";
}

const cautious = flags[0] === "cautious";

if (cautious) {
  console.warn(
    "%c-=-=<[CAUTIOUS MODE ENABLED, WILL PROMPT BEFORE MAKING CHANGES]>=-=-",
    "color: red; font-weight: bold;",
  );
}

console.debug("Args valid. Resolving path.");

// Resolve the provided path against the current working directory.
// If an absolute path is provided, that will be used. If a relative
// path is provided, it will be expanded to an absolute path from
// the current working directory.
const PATH = resolve(Deno.cwd(), Deno.args[0]);

console.debug("Path:", PATH);

// If no folder exists at `PATH`, then throw an error
if (!existsSync(PATH, { isDirectory: true })) {
  throw `Specified build root "${PATH}" does not exist!`;
}

console.debug(
  "`PATH` exists! Creating required directory structure in memory.",
);

const REQUIRED_DIRECTORIES = Object.fromEntries(([
  "vento",
  "assets/img",
  "assets/css",
  "serve",
] as const).map((dir) => [dir, join(PATH, dir)] as const));

if (
  existsSync(REQUIRED_DIRECTORIES["serve"]) &&
  (
    !cautious ||
    confirm(`Delete directory ${REQUIRED_DIRECTORIES["serve"]}?`)
  )
) {
  Deno.removeSync(REQUIRED_DIRECTORIES["serve"], { recursive: true });
}

console.debug("Creating required directories...");
await Promise.all(Object.values(REQUIRED_DIRECTORIES).map(ensureDir));

console.debug("Done. Copying assets...");
copy(
  dirname(REQUIRED_DIRECTORIES["assets/css"]),
  join(REQUIRED_DIRECTORIES["serve"], "assets"),
).then(() => console.log("Successfully copied assets!"))
  .catch((err) => {
    console.error(
      "%cAn error occurred copying assets!",
      "color: red; font-weight: bold;",
    );
    throw err;
  });

console.debug("Done. Compiling pages...");

const v = vento({
  autoDataVarname: true,
  autoescape: false,
  dataVarname: "it",
  includes: REQUIRED_DIRECTORIES["vento"],
});

const pages = getPageData();

Promise.all(
  pages.map((page) => {
    const srcPath = join(REQUIRED_DIRECTORIES["vento"], page.filepath);
    const outPath = join(
      REQUIRED_DIRECTORIES["serve"],
      extractBaseName(page.filepath) + ".html",
    );

    console.log(`Processing ${srcPath}`);

    return v.run(srcPath, { pages, navData, currentPage: page }).then(
      (result) => {
        if (cautious) {
          confirm(`Create rendered result of ${srcPath} at ${outPath}?`);
        }

        console.log(`Creating file ${outPath}`);
        return Deno.writeTextFile(outPath, result.content);
      },
    ).catch((err) => {
      err.message = `Error processing ${srcPath}!\n->\n` + (err?.message ?? "");
      throw err;
    });
  }),
).then(() => console.info("%cAll done!", "color: blue; font-weight: bold;"))
  .catch((err) => {
    console.error("%cAn error occurred!", "color: red; font-weight: bold;");
    throw err;
  });
