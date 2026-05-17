declare module "katex" {
  interface KatexOptions {
    displayMode?: boolean;
    throwOnError?: boolean;
    [key: string]: any;
  }
  function renderToString(expression: string, options?: KatexOptions): string;
  export default { renderToString };
}
