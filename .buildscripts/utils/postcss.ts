import minify from "@csstools/postcss-minify";
import autoprefixer from "autoprefixer";
import doiuse from "doiuse";
import postcss from "postcss";
import nested from "postcss-nested";

export async function transformCSS(styles: string, source: string) {
  const diuWarnings: unknown[] = [];

  const processor = postcss([
    nested,
    autoprefixer,
    minify,
    doiuse({ onFeatureUsage: (usageInfo: unknown) => diuWarnings.push(usageInfo) }),
  ]);

  const result = await processor.process(styles, { from: source });

  return {
    warnings: result.warnings(),
    diuWarnings,
    messages: result.messages,
    output: result.css,
  };
}
