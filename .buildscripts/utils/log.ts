export const error = (...data: unknown[]) =>
  console.error("%c[ERROR]: ", "color: red; font-weight: bold;", ...data);
export const warn = (...data: unknown[]) =>
  console.info("%c [WARN]: ", "color: gold; font-weight: bold;", ...data);
export const info = (...data: unknown[]) => console.info(" [INFO]: ", ...data);
export const debug = (...data: unknown[]) =>
  console.debug("%c[DEBUG]: ", "color: blue; font-weight: lighter;", ...data);
