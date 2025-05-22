import { resolve } from "path/resolve";
import * as log from "./log.ts";
import { existsSync } from "fs/exists";

log.debug("Started - validating environment.");
log.debug("Arguments:", Deno.args);

// Validate arguments
if (Deno.args.length !== 1) {
  throw new Error(
    "Invalid argument list! Please supply exactly one - the path to the project root.",
  );
}

// Resolve the project root
export const PROJECT_ROOT = resolve(Deno.cwd(), Deno.args[0]);
log.debug(`Resolved project root: ${PROJECT_ROOT}`);

// Throw an error if the project root doesn't exist or isn't a directory
if (!existsSync(PROJECT_ROOT, { isDirectory: true })) {
  throw new Error(`Specified project root \"${PROJECT_ROOT}\" does not exist!`);
}
