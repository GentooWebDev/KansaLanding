export function stripExtension(filepath: string, replaceWith = ""): string {
  return filepath.substring(0, filepath.lastIndexOf(".")) + replaceWith;
}
