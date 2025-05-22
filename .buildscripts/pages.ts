import { join } from "path/join";
import { pages } from "./pages.config.ts";
import { stripExtension } from "./utils/path.ts";

export { navData } from "./pages.config.ts";

export interface Page {
  title: string;
  filepath: string;
  href?: string;
  css?: false | string | string[];
  js?: false | string | string[];
}

type NavEntry = string | { href: string };
export type NavBar = Record<string, NavEntry>;

type DefaultProvider<T> = (val: T) => {
  [K in keyof T as undefined extends T[K] ? K : never]-?: T[K];
};

const defaultPage: DefaultProvider<Page> = (page) => ({
  css: false,
  href: join("/", stripExtension(page.filepath)),
  js: false,
});

export function getPageData(): Required<Page>[] {
  return pages.map((page) =>
    Object.assign(
      {},
      typeof defaultPage === "function" ? defaultPage(page) : defaultPage,
      page,
    )
  );
}
