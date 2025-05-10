import { join } from "path/join";
import type { DefaultProvider, Page } from "./pages.types.ts";
import { pages } from "./pages.config.ts";
import { stripExtension } from "./utils/path.ts";

const defaultPage: DefaultProvider<Page> = (page) => ({
  css: false,
  href: join("/", stripExtension(page.filepath)),
  js: false,
});

export { navData } from "./pages.config.ts";

export function getPageData(): Required<Page>[] {
  return pages.map((page) =>
    Object.assign(
      {},
      typeof defaultPage === "function" ? defaultPage(page) : defaultPage,
      page,
    )
  );
}
