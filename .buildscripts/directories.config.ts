import { join } from "path/join";
import { PROJECT_ROOT } from "./utils/init.ts";

export const REQUIRED_DIRECTORIES = {
  vento: join(PROJECT_ROOT, "vento"),
  assets: join(PROJECT_ROOT, "assets"),
  img: join(PROJECT_ROOT, "assets/img"),
  css: join(PROJECT_ROOT, "assets/css"),
  serve: join(PROJECT_ROOT, "serve"),
  servedAssets: join(PROJECT_ROOT, "serve/assets"),
  servedCss: join(PROJECT_ROOT, "serve/assets/css"),
  logs: join(PROJECT_ROOT, "logs"),
  bad_code: join(PROJECT_ROOT, "bad_code"),
};

export const RESET_DIRECTORY_KEYS = [
  "serve",
  "logs",
  "bad_code",
] as const satisfies Array<
  typeof REQUIRED_DIRECTORIES[keyof typeof REQUIRED_DIRECTORIES]
>;
