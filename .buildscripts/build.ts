import { copy, ensureDir, existsSync, walk } from "fs";
import { dirname, extname, join, resolve } from "path";
import vento from "vento";
import { extractDotlessBasename, getPageData, navData } from "./pages.ts";
import { compile as compileSass } from "npm:sass";

console.debug("Started - not yet validated environment.");
console.debug("Unparsed Args:", Deno.args);

const [flags, args] = Deno.args.reduce((acc, arg) => {
  if (arg.startsWith("--")) {
    acc[0].push(arg.substring(2));
  } else {
    acc[1].push(arg);
  }

  return acc;
}, [Array<string>(), Array<string>()]);

console.debug("Parsed Args:", args);
console.debug("Parsed Flags:", flags);

// Check if we have a path supplied
if (args.length !== 1) {
  throw "Invalid argument list! Please supply exactly one - the path to the build root.";
}

if (flags.length > 1 || (flags.length === 1 && flags[0] !== "cautious")) {
  throw "Invalid flags! Only one is valid: --cautious.";
}

const cautious = flags[0] === "cautious";

function doCautiously<T>(msg: string, cb: () => T): T {
  if (!cautious || confirm(msg)) return cb();
}

if (cautious) {
  console.warn(
    "%c-=-=<[CAUTIOUS MODE ENABLED, WILL PROMPT BEFORE MAKING POTENTIALLY DESTRUCTIVE CHANGES]>=-=-",
    "color: red; font-weight: bold;",
  );
}

console.debug("Args valid. Resolving path...");

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
  "Path exists! Creating required directory structure in memory.",
);

const REQUIRED_DIRECTORIES = Object.fromEntries(
  ([
    "vento",
    "assets",
    "assets/img",
    "assets/css",
    "serve",
  ] as const).map((dir) => [dir, join(PATH, dir)] as const),
);

if (existsSync(REQUIRED_DIRECTORIES["serve"])) {
  doCautiously(
    `Delete directory ${REQUIRED_DIRECTORIES["serve"]}?`,
    () => Deno.removeSync(REQUIRED_DIRECTORIES["serve"], { recursive: true }),
  );
}

console.debug("Creating required directories...");
await Promise.all(
  Object.values(REQUIRED_DIRECTORIES).map((dir) =>
    existsSync(dir)
      ? undefined
      : doCautiously(`Create directory ${dir}?`, () => ensureDir(dir))
  ),
);

console.debug("Copying assets...");
const ASSETS_DEST = join(REQUIRED_DIRECTORIES["serve"], "assets");
await doCautiously(
  `Copy directory ${REQUIRED_DIRECTORIES["assets"]} to ${ASSETS_DEST}?`,
  () =>
    copy(REQUIRED_DIRECTORIES["assets"], ASSETS_DEST).then(() => {
      console.log("Successfully copied assets! Deleting CSS files...");
      const CSS_ASSETS_DEST = join(ASSETS_DEST, "css");
      doCautiously(
        `Delete ${CSS_ASSETS_DEST}?`,
        () => Deno.removeSync(CSS_ASSETS_DEST, { recursive: true }),
      );
    }).catch((err) => {
      console.error(
        "%cAn error occurred copying assets!",
        "color: red; font-weight: bold;",
      );
      throw err;
    }),
);

console.debug("Done. Starting parallel tasks:");

console.debug("Compiling SCSS...");
const COMPILE_SCSS = Array<Promise<void>>();
for await (
  const file of walk(REQUIRED_DIRECTORIES["assets/css"], {
    includeSymlinks: false,
    includeDirs: false,
  })
) {
  const isScss = file.name.endsWith(".scss");

  const destination = join(
    ASSETS_DEST,
    "css",
    file.path.substring(
      REQUIRED_DIRECTORIES["assets/css"].length,
      file.path.length - extname(file.path).length,
    ) + ".css",
  );
  const destFolder = dirname(destination);

  if (!existsSync(destFolder)) {
    await doCautiously(
      `Create directory ${destFolder}`,
      () => ensureDir(destFolder),
    );
  }

  console.log(
    `${isScss ? "Compiling" : "Copying"} ${file.path} into ${destination}`,
  );
  COMPILE_SCSS.push(
    !isScss
      ? doCautiously(
        `Copy CSS file from ${file.path} to ${destination}?`,
        () => copy(file.path, destination),
      )
      : doCautiously(
        `Compile ${file.path} into ${destination}?`,
        () =>
          Deno.writeTextFile(destination, compileSass(file.path).css, {
            createNew: true,
          }),
      ).catch((err) => {
        const message = `Error ${isScss ? "compiling SCSS" : "copying CSS"}!`;
        try {
          err.message = `${message}\n->\n` + (err?.message ?? "");
        } catch {
          console.error(
            "Could not set custom error message - should have been:",
            message,
          );
        }
        throw err;
      }),
  );
}

console.debug("Compiling pages...");

const v = vento({
  autoDataVarname: true,
  autoescape: false,
  dataVarname: "it",
  includes: REQUIRED_DIRECTORIES["vento"],
});

const pages = getPageData();

const COMPILE_PAGES = pages.map((page) => {
  const srcPath = join(REQUIRED_DIRECTORIES["vento"], page.filepath);
  const outPath = join(
    REQUIRED_DIRECTORIES["serve"],
    extractDotlessBasename(page.filepath) + ".html",
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
});

Promise.all([
  ...COMPILE_SCSS,
  ...COMPILE_PAGES,
]).then(() => console.info("%cAll done!", "color: blue; font-weight: bold;"))
  .catch((err) => {
    console.error("%cAn error occurred!", "color: red; font-weight: bold;");
    throw err;
  });
