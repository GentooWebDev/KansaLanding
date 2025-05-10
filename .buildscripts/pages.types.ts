// --- Types ---

export interface Page {
  title: string;
  filepath: string;
  href?: string;
  css?: false | string;
  js?: false | string;
}

export type NavEntry = string | { href: string };
export type NavBar = Record<string, NavEntry>;

export type DefaultProvider<T> = (val: T) => {
  [K in keyof T as undefined extends T[K] ? K : never]-?: T[K];
};
