import { join } from "path/join";

/* Type definitions begin */

interface Page {
  title: string;
  filepath: string;
  href?: string;
  css?: false | string;
}

type NavEntry = typeof pages[number]["title"] | { href: string };
type NavBar = Record<string, NavEntry>;

type DefaultProvider<T> = (val: T) => {
  [K in keyof T as undefined extends T[K] ? K : never]-?: T[K];
};

/* Type definitions end */

const defaultPage: DefaultProvider<Page> = (page) => ({
  css: false,
  href: join("/", extractBaseName(page.filepath)),
});

const pages = [
  {
    title: "Home",
    href: "/",
    filepath: "index.vto",
    css: "index",
  },
  {
    title: "About",
    filepath: "about.vto",
  },
  {
    title: "Contact",
    filepath: "contact.vto",
  },
  {
    title: "Privacy",
    filepath: "privacy.vto",
  },
  {
    title: "Refunds Policy",
    filepath: "refunds.vto",
  },
] as const satisfies Page[];

export const navData: { top: NavBar; bottom: NavBar } = {
  top: {
    "Home": "Home",
    "Contact": "Contact",
    "About Us": "About",
  },
  bottom: {
    "Refunds Policy": "Refunds Policy",
    "Privacy Statement": "Privacy",
    "Contact Us": "Contact",
  },
};

export function getPageData(): Required<Page>[] {
  return pages.map((page) =>
    Object.assign(
      {},
      defaultPage instanceof Function ? defaultPage(page) : defaultPage,
      page,
    )
  );
}

export function extractBaseName(filepath: string): string {
  return filepath.substring(0, filepath.lastIndexOf("."));
}
