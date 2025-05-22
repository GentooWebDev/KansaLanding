import minify from "@csstools/postcss-minify";
import autoprefixer from "autoprefixer";
import doiuse from "doiuse";
import postcss from "postcss";
import nested from "postcss-nested";

export async function transformCSS(
  styles: string,
  source: string,
  messageConsumer?: (msgs: {
    processing: postcss.Message[];
    support: postcss.Message[];
  }) => void,
) {
  const processor = postcss([nested, autoprefixer, minify]);
  const checker = postcss([doiuse({ ignore: ["css-focus-visible"] })]);

  const result = await processor.process(styles, { from: source });
  const doIUseResult = await checker.process(result.css, { from: undefined });

  messageConsumer?.({ processing: result.messages, support: doIUseResult.messages });

  return result.css;
}
