import { useCallback, useState } from "react";

// Export method types
export type ExportMethod = "auto" | "print" | "jspdf";

export interface ExportOptions {
  method?: ExportMethod;
  title?: string;
  onProgress?: (progress: number) => void;
}

/**
 * Strip emoji characters from text - jsPDF's built-in fonts can't render
 * them as vector glyphs (only used for the title, which jsPDF draws as
 * real text rather than as part of the rasterized page image).
 */
function stripEmojis(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/[\u{200D}]/gu, "")
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "")
    .trim();
}

/**
 * Convert outline task lists for PDF (replace checkboxes with symbols) -
 * native checkbox inputs render inconsistently (or not at all) across
 * browser print engines.
 */
function convertOutlineForPDF(element: HTMLElement): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement;

  const taskItems = clone.querySelectorAll(
    '.outline-task-item, [data-type="taskItem"]',
  );

  taskItems.forEach((item) => {
    const checkbox = item.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    if (checkbox) {
      const isChecked = checkbox.checked;
      const symbol = document.createElement("span");
      symbol.textContent = isChecked ? "[x] " : "[ ] ";
      checkbox.replaceWith(symbol);
    }
  });

  return clone;
}

/**
 * Check if content is outline format
 */
function isOutlineFormat(element: HTMLElement): boolean {
  return (
    element.querySelector(".outline-mode-container, .outline-task-item") !==
    null
  );
}

/**
 * Replace <canvas> elements in a clone with <img> snapshots taken from the
 * matching *live* canvas. cloneNode() only copies attributes, never the
 * drawn bitmap, so charts and other canvas-based content silently render
 * blank in any cloned-DOM export path unless this runs first.
 */
function inlineCanvasBitmaps(
  liveRoot: HTMLElement,
  clonedRoot: HTMLElement,
): void {
  const liveCanvases = Array.from(liveRoot.querySelectorAll("canvas"));
  const clonedCanvases = Array.from(clonedRoot.querySelectorAll("canvas"));

  liveCanvases.forEach((liveCanvas, i) => {
    const clonedCanvas = clonedCanvases[i];
    if (!clonedCanvas) return;

    let dataUrl: string;
    try {
      dataUrl = liveCanvas.toDataURL("image/png");
    } catch {
      // Tainted canvas (cross-origin draw) - leave the empty clone as-is
      // rather than fail the whole export.
      return;
    }

    const img = document.createElement("img");
    img.src = dataUrl;
    img.width = liveCanvas.width;
    img.height = liveCanvas.height;
    const style = clonedCanvas.getAttribute("style");
    if (style) img.setAttribute("style", style);
    const className = clonedCanvas.getAttribute("class");
    if (className) img.setAttribute("class", className);
    clonedCanvas.replaceWith(img);
  });
}

/**
 * Resolve relative url(...) references in extracted CSS text against the
 * document's base URI. Needed because copied stylesheet text is injected
 * into a popup window whose location is about:blank, where relative paths
 * (fonts, background images) would otherwise fail to resolve.
 */
function absolutizeCssUrls(cssText: string): string {
  return cssText.replace(
    /url\((['"]?)([^'")]+)\1\)/g,
    (match, quote: string, url: string) => {
      if (/^(data:|https?:|\/\/)/.test(url)) return match;
      try {
        const abs = new URL(url, document.baseURI).href;
        return `url(${quote}${abs}${quote})`;
      } catch {
        return match;
      }
    },
  );
}

/**
 * Pull the app's actual CSS (Tailwind utilities, CSS variables, the
 * dedicated `@media print` rules in editor.css) as inline text so it can
 * be embedded in the popup print window. The previous implementation
 * wrote a ~20-line hand-rolled stylesheet into that window, so none of
 * the app's real styling ever applied there - content rendered unstyled
 * or with the wrong colors.
 */
function extractDocumentCss(): string {
  const chunks: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        chunks.push(absolutizeCssUrls(rule.cssText));
      }
    } catch {
      // Cross-origin stylesheet - can't read its rules. Safe to skip since
      // export only needs the app's own styles.
    }
  }
  return chunks.join("\n");
}

/**
 * Wait for any not-yet-loaded <img> elements under root to finish loading
 * (or fail) before we rasterize/print, capped by a timeout so a broken
 * image link can never hang the export.
 */
function waitForImages(root: ParentNode, timeoutMs = 8000): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img")).filter(
    (img) => !img.complete,
  );
  if (imgs.length === 0) return Promise.resolve();

  return Promise.race([
    Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
      ),
    ).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

/**
 * Light-theme design tokens, mirroring `:root` in app/globals.css.
 * (`--chart-*` is intentionally omitted: chart series colors are
 * self-contained and already legible against a light card.)
 */
const LIGHT_THEME_VARS: [string, string][] = [
  ["--background", "0 0% 100%"],
  ["--foreground", "240 6% 11%"],
  ["--card", "0 0% 100%"],
  ["--card-foreground", "240 6% 11%"],
  ["--popover", "0 0% 100%"],
  ["--popover-foreground", "240 6% 11%"],
  ["--primary", "240 5.9% 10%"],
  ["--primary-foreground", "0 0% 98%"],
  ["--secondary", "240 4.8% 95.9%"],
  ["--secondary-foreground", "240 5.9% 10%"],
  ["--muted", "240 5% 96%"],
  ["--muted-foreground", "240 4.5% 38%"],
  ["--accent", "240 4.8% 95.9%"],
  ["--accent-foreground", "240 5.9% 10%"],
  ["--destructive", "0 84.2% 60.2%"],
  ["--destructive-foreground", "0 0% 98%"],
  ["--border", "240 6% 86%"],
  ["--input", "240 6% 86%"],
  ["--ring", "240 5.9% 10%"],
];

/**
 * Exported notes always come from the app's dark-only editor UI. Force a
 * light, print-safe appearance so the page is legible regardless of the
 * live theme:
 *  - swap the app's CSS color variables to their light-mode values, which
 *    fixes every shadcn/Tailwind-variable-driven surface (cards, badges,
 *    popovers) automatically, foreground and background together.
 *  - drop `prose-invert`: Tailwind Typography's light-on-dark palette is
 *    hard-coded independent of those variables, and is the actual source
 *    of the washed-out, barely-legible body text.
 *  - flip the mind-map canvas, which hard-codes a literal dark surface
 *    color (`bg-slate-950`) instead of using the variables above.
 * Diagram *node* colors (gradients, white labels) are deliberately left
 * untouched - they're self-contained and already legible on their own
 * background, and forcing a single text color onto every descendant would
 * make plenty of them unreadable instead of fixing anything.
 */
function applyPrintSafeTheme(root: HTMLElement): void {
  for (const [key, value] of LIGHT_THEME_VARS) {
    root.style.setProperty(key, value);
  }
  root.style.setProperty("background-color", "#ffffff", "important");

  root.classList.remove("prose-invert");
  root
    .querySelectorAll(".prose-invert")
    .forEach((el) => el.classList.remove("prose-invert"));

  root.querySelectorAll<HTMLElement>(".bg-slate-950").forEach((el) => {
    el.style.setProperty("background-color", "#ffffff", "important");
  });
}

/**
 * Supplemental print-safe rules for typography elements whose colors
 * aren't variable-driven at all (code blocks, katex, the resource-mention
 * chip button) - safe as broad rules since none of them collide with
 * diagram content the way a blanket `color` override would.
 */
function injectExportPrintStyles(scopeSelector: string): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = `
    ${scopeSelector} button {
      background: #f3f4f6 !important;
      border: 1px solid #d1d5db !important;
      color: #000000 !important;
    }
    ${scopeSelector} pre { background: #f5f5f5 !important; border: 1px solid #ddd !important; padding: 12px !important; }
    ${scopeSelector} code { background: #f0f0f0 !important; }
    ${scopeSelector} blockquote { border-left: 3px solid #666 !important; padding-left: 12px !important; color: #333 !important; }
    ${scopeSelector} table { border-collapse: collapse !important; }
    ${scopeSelector} th, ${scopeSelector} td { border: 1px solid #ddd !important; padding: 8px !important; }
    ${scopeSelector} th { background: #f0f0f0 !important; }
    ${scopeSelector} img { max-width: 100% !important; }
    ${scopeSelector} .katex, ${scopeSelector} .katex * { color: #000000 !important; }
    ${scopeSelector} .katex .frac-line { border-color: #333333 !important; }
    ${scopeSelector} .inline-math-content,
    ${scopeSelector} .block-math-content,
    ${scopeSelector} .inline-math-container,
    ${scopeSelector} .block-math-container {
      background: #f3f4f6 !important;
      color: #000000 !important;
    }
  `;
  document.head.appendChild(style);
  return style;
}

/** Shared clean-up applied to any clone before it's exported. */
function prepareCloneForExport(
  liveElement: HTMLElement,
): HTMLElement {
  const clone = liveElement.cloneNode(true) as HTMLElement;
  inlineCanvasBitmaps(liveElement, clone);

  const prepared = isOutlineFormat(clone) ? convertOutlineForPDF(clone) : clone;

  prepared
    .querySelectorAll("[data-html2canvas-ignore]")
    .forEach((el) => el.remove());
  prepared
    .querySelectorAll(".ProseMirror-gapcursor")
    .forEach((el) => el.remove());
  // Interactive diagram chrome (zoom controls, minimap, attribution) has
  // no place in a static export.
  prepared
    .querySelectorAll(
      ".react-flow__minimap, .react-flow__controls, .react-flow__attribution, .outline-toolbar",
    )
    .forEach((el) => el.remove());

  applyPrintSafeTheme(prepared);

  return prepared;
}

export function usePDF() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  /**
   * Export using the browser's native print dialog. Renders the note in a
   * popup window that carries over the app's real stylesheet (including
   * the dedicated `@media print` rules) so output matches what's on
   * screen, with diagrams/charts included as static images.
   */
  const printExport = useCallback(
    async (
      elementId: string,
      title?: string,
      onProgress?: (progress: number) => void,
    ): Promise<void> => {
      onProgress?.(10);

      const element = document.getElementById(elementId);
      if (!element) throw new Error("Element not found");

      onProgress?.(25);
      const printContent = prepareCloneForExport(element);

      onProgress?.(40);

      const printWindow = window.open("", "_blank", "width=900,height=1000");
      if (!printWindow) {
        throw new Error(
          "Could not open print window. Please check popup blocker settings.",
        );
      }

      const printTitle = title ? stripEmojis(title) : "Note Export";
      const documentCss = extractDocumentCss();
      const rootClass = document.documentElement.className;
      const rootTheme = document.documentElement.getAttribute("data-theme");

      printWindow.document.write(`
        <!DOCTYPE html>
        <html class="${rootClass}"${rootTheme ? ` data-theme="${rootTheme}"` : ""}>
          <head>
            <meta charset="utf-8" />
            <title>${printTitle}</title>
            <style>${documentCss}</style>
            <style>
              @page { size: A4; margin: 20mm; }
              #pdf-export-title {
                font-size: 24pt;
                font-weight: 700;
                margin-bottom: 16px;
                page-break-after: avoid;
              }
              img, canvas, svg { max-width: 100%; }
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            ${title ? `<h1 id="pdf-export-title">${printTitle}</h1>` : ""}
            <div id="pdf-export-body">${printContent.outerHTML}</div>
          </body>
        </html>
      `);

      printWindow.document.close();
      onProgress?.(70);

      await new Promise<void>((resolve) => {
        const finish = () => resolve();
        if (printWindow.document.readyState === "complete") {
          finish();
        } else {
          printWindow.onload = finish;
          setTimeout(finish, 3000);
        }
      });

      const body = printWindow.document.getElementById("pdf-export-body");
      if (body) await waitForImages(body);

      onProgress?.(100);
      setTimeout(() => printWindow.print(), 150);
    },
    [],
  );

  /**
   * Export by rasterizing the live, fully-styled note content (via
   * html2canvas) and slicing it across A4 pages in a jsPDF document. This
   * replaces a previous manual DOM-to-text walker that only understood a
   * handful of tags and silently dropped every image, chart, and diagram.
   */
  const jspdfExport = useCallback(
    async (
      elementId: string,
      filename: string,
      title?: string,
      onProgress?: (progress: number) => void,
    ): Promise<void> => {
      onProgress?.(5);

      const element = document.getElementById(elementId);
      if (!element) throw new Error("Element not found");

      const preparedClone = prepareCloneForExport(element);

      onProgress?.(15);

      // Mount off-screen (not display:none - layout/paint must run for
      // html2canvas to have anything to capture) at the element's real
      // width so text reflows exactly as it does on screen.
      const stageId = "pdf-export-stage";
      const stage = document.createElement("div");
      stage.id = stageId;
      stage.style.position = "fixed";
      stage.style.top = "0";
      stage.style.left = "-10000px";
      stage.style.width = `${element.clientWidth || element.offsetWidth || 800}px`;
      stage.style.pointerEvents = "none";
      stage.appendChild(preparedClone);
      document.body.appendChild(stage);
      const printStyle = injectExportPrintStyles(`#${stageId}`);

      try {
        await waitForImages(stage);
        if (typeof document.fonts?.ready?.then === "function") {
          await document.fonts.ready.catch(() => undefined);
        }

        onProgress?.(30);

        // Loaded on demand: html2canvas/jsPDF are only needed when an
        // export actually runs, not on every note open.
        const [{ jsPDF }, html2canvasModule] = await Promise.all([
          import("jspdf"),
          import("html2canvas"),
        ]);
        const html2canvas = html2canvasModule.default;

        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
          compress: true,
        });

        const margin = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const contentWidth = pageWidth - margin * 2;

        let cursorY = margin;

        if (title) {
          doc.setFontSize(20);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(0, 0, 0);
          doc.text(stripEmojis(title), margin, cursorY + 6);
          cursorY += 12;
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.5);
          doc.line(margin, cursorY, margin + contentWidth, cursorY);
          cursorY += 6;
        }

        onProgress?.(45);

        // applyPrintSafeTheme() already swapped the clone onto light-theme
        // colors, so a plain white canvas background matches it exactly.
        const canvas = await html2canvas(preparedClone, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          windowWidth: stage.scrollWidth,
        });

        onProgress?.(70);

        const pxPerMm = canvas.width / contentWidth;
        const firstPageHeightPx = Math.max(
          1,
          Math.floor((pageHeight - cursorY - margin) * pxPerMm),
        );
        const fullPageHeightPx = Math.max(
          1,
          Math.floor((pageHeight - margin * 2) * pxPerMm),
        );

        let renderedPx = 0;
        let isFirstSlice = true;

        while (renderedPx < canvas.height) {
          const available = isFirstSlice
            ? firstPageHeightPx
            : fullPageHeightPx;
          const sliceHeightPx = Math.min(available, canvas.height - renderedPx);
          if (sliceHeightPx <= 0) break;

          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeightPx;
          const ctx = pageCanvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(
              canvas,
              0,
              renderedPx,
              canvas.width,
              sliceHeightPx,
              0,
              0,
              canvas.width,
              sliceHeightPx,
            );
            const imgData = pageCanvas.toDataURL("image/png");
            const sliceHeightMm = sliceHeightPx / pxPerMm;
            const y = isFirstSlice ? cursorY : margin;
            doc.addImage(imgData, "PNG", margin, y, contentWidth, sliceHeightMm);
          }

          renderedPx += sliceHeightPx;
          isFirstSlice = false;

          if (renderedPx < canvas.height) doc.addPage();

          onProgress?.(70 + Math.min(25, Math.floor((renderedPx / canvas.height) * 25)));
        }

        onProgress?.(95);
        doc.save(filename);
        onProgress?.(100);
      } finally {
        document.body.removeChild(stage);
        printStyle.remove();
      }
    },
    [],
  );

  /**
   * Main export function with smart method selection
   */
  const exportPDF = useCallback(
    async (
      elementId: string,
      filename: string,
      options: ExportOptions = {},
    ): Promise<void> => {
      const { method = "auto", title, onProgress } = options;

      setIsLoading(true);
      setProgress(0);

      const progressHandler = (p: number) => {
        setProgress(p);
        onProgress?.(p);
      };

      try {
        await new Promise((resolve) => setTimeout(resolve, 0));

        const element = document.getElementById(elementId);
        if (!element) throw new Error("Element not found");

        // Both methods now fully support images, charts, and diagrams, so
        // "auto" simply prefers the direct download and falls back to the
        // print dialog if rasterization fails for any reason.
        const selectedMethod: "print" | "jspdf" =
          method === "print" ? "print" : "jspdf";

        if (selectedMethod === "print") {
          await printExport(elementId, title, progressHandler);
        } else {
          try {
            await jspdfExport(elementId, filename, title, progressHandler);
          } catch (jspdfError) {
            console.warn(
              "jsPDF export failed, falling back to print:",
              jspdfError,
            );
            await printExport(elementId, title, progressHandler);
          }
        }
      } catch (error) {
        console.error("PDF export failed:", error);
        alert(
          "PDF export failed. Please try using your browser's print function (Ctrl+P or Cmd+P) and save as PDF.\n\n" +
            "Error: " +
            (error instanceof Error ? error.message : String(error)),
        );
      } finally {
        setIsLoading(false);
        setProgress(0);
      }
    },
    [printExport, jspdfExport],
  );

  // Legacy function for backwards compatibility
  const generatePDF = useCallback(
    async (elementId: string, filename: string, title?: string) => {
      await exportPDF(elementId, filename, { method: "auto", title });
    },
    [exportPDF],
  );

  return {
    generatePDF,
    exportPDF,
    isLoading,
    progress,
  };
}
