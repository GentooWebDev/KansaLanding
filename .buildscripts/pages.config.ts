import type { NavBar, Page } from "./pages.types.ts";

export const pages: Page[] = [
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
  {
    title: "404 - Not Found",
    filepath: "404.vto",
    js: "needs-js",
  },
];

export const navData: { top: NavBar; bottom: NavBar } = {
  top: {
    Home: "Home",
    Contact: "Contact",
    "About Us": "About",
  },
  bottom: {
    "Refunds Policy": "Refunds Policy",
    "Privacy Statement": "Privacy",
    "Contact Us": "Contact",
  },
};
