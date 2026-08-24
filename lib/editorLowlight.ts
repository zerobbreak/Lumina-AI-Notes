import { createLowlight, common } from "lowlight";

/**
 * Shared lowlight instance for TipTap code blocks (highlight.js grammars).
 * `common` includes java, javascript, typescript, python, bash, sql, etc.
 */
export const editorLowlight = createLowlight(common);
