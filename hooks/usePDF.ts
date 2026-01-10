import { useCallback, useState } from "react";
import { jsPDF } from "jspdf";

// Export method types
export type ExportMethod = "auto" | "print" | "jspdf";

export interface ExportOptions {
  method?: ExportMethod;
  title?: string;
  onProgress?: (progress: number) => void;
}

interface PageMetrics {
  width: number;
  height: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  contentWidth: number;
  contentHeight: number;
}

/**
 * Strip emoji characters from text - jsPDF doesn't handle emojis well
 */
function stripEmojis(text: string): string {
  // Remove common emoji ranges
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
 * Strip emojis from an element's text content recursively
 */
function stripEmojisFromElement(element: HTMLElement): void {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

  const textNodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push(node);
  }

  textNodes.forEach((textNode) => {
    if (textNode.textContent) {
      textNode.textContent = stripEmojis(textNode.textContent);
    }
  });
}

/**
 * Convert Cornell 2-column layout to linear format for PDF export
 */
function convertCornellToLinear(element: HTMLElement): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement;

  const cornellContainer = clone.querySelector(".cornell-container");
  if (!cornellContainer) return clone;

  const cuesTextarea = clone.querySelector(
    'textarea[placeholder*="Key terms"]'
  ) as HTMLTextAreaElement;
  const notesSection = clone.querySelector(".ProseMirror");
  const summaryTextarea = clone.querySelector(
    'textarea[placeholder*="Summarize"]'
  ) as HTMLTextAreaElement;

  const linearContainer = document.createElement("div");
  linearContainer.className = "cornell-linear-export";

  // Cues section
  if (cuesTextarea?.value) {
    const cuesSection = document.createElement("div");
    cuesSection.innerHTML = `
      <h2>CUES & QUESTIONS</h2>
      <p>${stripEmojis(cuesTextarea.value)}</p>
    `;
    linearContainer.appendChild(cuesSection);
  }

  // Notes section
  if (notesSection) {
    const notesWrapper = document.createElement("div");
    const header = document.createElement("h2");
    header.textContent = "NOTES";
    notesWrapper.appendChild(header);
    const notesClone = notesSection.cloneNode(true) as HTMLElement;
    stripEmojisFromElement(notesClone);
    notesWrapper.appendChild(notesClone);
    linearContainer.appendChild(notesWrapper);
  }

  // Summary section
  if (summaryTextarea?.value) {
    const summarySection = document.createElement("div");
    summarySection.innerHTML = `
      <h2>SUMMARY</h2>
      <p>${stripEmojis(summaryTextarea.value)}</p>
    `;
    linearContainer.appendChild(summarySection);
  }

  cornellContainer.replaceWith(linearContainer);
  return clone;
}

/**
 * Convert outline task lists for PDF (replace checkboxes with symbols)
 */
function convertOutlineForPDF(element: HTMLElement): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement;

  const taskItems = clone.querySelectorAll(
    '.outline-task-item, [data-type="taskItem"]'
  );

  taskItems.forEach((item) => {
    const checkbox = item.querySelector(
      'input[type="checkbox"]'
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
 * Check if content is Cornell format
 */
function isCornellFormat(element: HTMLElement): boolean {
  return element.querySelector(".cornell-container") !== null;
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

export function usePDF() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  /**
   * Export using browser print dialog - most reliable method
   */
  const printExport = useCallback(
    async (
      elementId: string,
      title?: string,
      onProgress?: (progress: number) => void
    ): Promise<void> => {
      onProgress?.(10);

      const element = document.getElementById(elementId);
      if (!element) throw new Error("Element not found");

      onProgress?.(30);

      let printContent = element.cloneNode(true) as HTMLElement;

      if (isCornellFormat(printContent)) {
        printContent = convertCornellToLinear(printContent);
      }

      if (isOutlineFormat(printContent)) {
        printContent = convertOutlineForPDF(printContent);
      }

      printContent
        .querySelectorAll("[data-html2canvas-ignore]")
        .forEach((el) => el.remove());
      printContent
        .querySelectorAll(".ProseMirror-gapcursor")
        .forEach((el) => el.remove());
      stripEmojisFromElement(printContent);

      onProgress?.(50);

      const printWindow = window.open("", "_blank", "width=800,height=600");
      if (!printWindow) {
        throw new Error(
          "Could not open print window. Please check popup blocker settings."
        );
      }

      const printTitle = title ? stripEmojis(title) : "Note Export";

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${printTitle}</title>
            <style>
              @page { size: A4; margin: 20mm; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 12pt;
                line-height: 1.6;
                color: #000;
                margin: 0;
                padding: 20px;
              }
              h1 { font-size: 24pt; margin-bottom: 16px; page-break-after: avoid; }
              h2 { font-size: 18pt; margin-top: 24px; margin-bottom: 12px; page-break-after: avoid; }
              h3 { font-size: 14pt; margin-top: 16px; margin-bottom: 8px; page-break-after: avoid; }
              h4 { font-size: 12pt; margin-top: 12px; margin-bottom: 6px; page-break-after: avoid; }
              p { margin-bottom: 12px; orphans: 3; widows: 3; }
              ul, ol { margin-bottom: 12px; padding-left: 24px; }
              li { margin-bottom: 6px; }
              blockquote { border-left: 3px solid #666; padding-left: 16px; margin: 16px 0; font-style: italic; color: #444; }
              pre, code { font-family: 'Consolas', monospace; font-size: 10pt; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
              pre { padding: 16px; overflow-x: auto; page-break-inside: avoid; }
              table { width: 100%; border-collapse: collapse; margin: 16px 0; page-break-inside: avoid; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background: #f0f0f0; font-weight: 600; }
              hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
              @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            </style>
          </head>
          <body>
            ${title ? `<h1>${printTitle}</h1>` : ""}
            ${printContent.innerHTML}
          </body>
        </html>
      `);

      printWindow.document.close();
      onProgress?.(80);

      printWindow.onload = () => {
        onProgress?.(100);
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    },
    []
  );

  /**
   * Export using jsPDF with DOM-based text rendering
   */
  const jspdfExport = useCallback(
    async (
      elementId: string,
      filename: string,
      title?: string,
      onProgress?: (progress: number) => void
    ): Promise<void> => {
      onProgress?.(5);

      const element = document.getElementById(elementId);
      if (!element) throw new Error("Element not found");

      let clonedElement = element.cloneNode(true) as HTMLElement;

      if (isCornellFormat(clonedElement)) {
        clonedElement = convertCornellToLinear(clonedElement);
      }

      if (isOutlineFormat(clonedElement)) {
        clonedElement = convertOutlineForPDF(clonedElement);
      }

      onProgress?.(15);

      clonedElement
        .querySelectorAll("[data-html2canvas-ignore]")
        .forEach((el) => el.remove());
      clonedElement
        .querySelectorAll(".ProseMirror-gapcursor")
        .forEach((el) => el.remove());
      stripEmojisFromElement(clonedElement);

      onProgress?.(25);

      // Initialize PDF
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;

      let currentY = margin;
      const lineHeightMm = 5;

      // Check page break
      const checkPageBreak = (requiredHeight: number): void => {
        if (currentY + requiredHeight > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
        }
      };

      // Render wrapped text
      const renderText = (
        text: string,
        fontSize: number,
        fontStyle: "normal" | "bold" | "italic" = "normal",
        indent: number = 0
      ): void => {
        const cleanText = stripEmojis(text).trim();
        if (!cleanText) return;

        doc.setFontSize(fontSize);
        doc.setFont("helvetica", fontStyle);
        doc.setTextColor(0, 0, 0);

        const maxWidth = contentWidth - indent;
        const lines = doc.splitTextToSize(cleanText, maxWidth);
        // Convert pt to mm: 1pt = 0.353mm, then multiply by 1.5 for comfortable line height
        const lh = fontSize * 0.353 * 1.5;

        for (const line of lines) {
          checkPageBreak(lh);
          doc.text(line, margin + indent, currentY);
          currentY += lh;
        }
      };

      // Add title
      if (title) {
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(stripEmojis(title), margin, currentY);
        currentY += 10;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(margin, currentY, margin + contentWidth, currentY);
        currentY += 8;
      }

      onProgress?.(40);

      // Process elements recursively
      const processElement = (elem: Element): void => {
        const tag = elem.tagName?.toLowerCase() || "";

        // Skip hidden/toolbar elements
        const htmlEl = elem as HTMLElement;
        if (
          htmlEl.style?.display === "none" ||
          elem.classList?.contains("outline-toolbar")
        ) {
          return;
        }

        switch (tag) {
          case "h1":
            currentY += 4;
            checkPageBreak(10);
            renderText(elem.textContent || "", 20, "bold");
            currentY += 4;
            break;

          case "h2":
            currentY += 4;
            checkPageBreak(8);
            renderText(elem.textContent || "", 16, "bold");
            currentY += 3;
            break;

          case "h3":
            currentY += 3;
            checkPageBreak(7);
            renderText(elem.textContent || "", 14, "bold");
            currentY += 2;
            break;

          case "h4":
          case "h5":
          case "h6":
            currentY += 2;
            checkPageBreak(6);
            renderText(elem.textContent || "", 12, "bold");
            currentY += 2;
            break;

          case "p":
            const pText = elem.textContent?.trim();
            if (pText) {
              currentY += 2;
              renderText(pText, 11, "normal");
              currentY += 3;
            }
            break;

          case "blockquote":
            currentY += 3;
            checkPageBreak(8);
            const startY = currentY;
            const quoteText = elem.textContent?.trim();
            if (quoteText) {
              renderText(quoteText, 11, "italic", 8);
              doc.setDrawColor(150, 150, 150);
              doc.setLineWidth(0.8);
              doc.line(margin + 2, startY - 2, margin + 2, currentY);
            }
            currentY += 3;
            break;

          case "ul":
          case "ol":
            currentY += 2;
            const listItems = elem.querySelectorAll(":scope > li");
            listItems.forEach((li, idx) => {
              const bullet = tag === "ol" ? `${idx + 1}.` : "•";
              const liText = li.textContent?.trim();
              if (liText) {
                checkPageBreak(6);
                doc.setFontSize(11);
                doc.setFont("helvetica", "normal");
                doc.text(bullet, margin + 2, currentY);
                renderText(liText, 11, "normal", 8);
                currentY += 1;
              }
            });
            currentY += 2;
            break;

          case "pre":
          case "code":
            currentY += 4;
            const codeText = elem.textContent?.trim();
            if (codeText) {
              const codeFontSize = 9;
              const codeLh = codeFontSize * 0.353 * 1.4; // Proper line height for code
              doc.setFillColor(245, 245, 245);
              const codeLines = doc.splitTextToSize(
                codeText,
                contentWidth - 10
              );
              const codeHeight = codeLines.length * codeLh + 6;
              checkPageBreak(codeHeight);
              doc.rect(margin, currentY - 2, contentWidth, codeHeight, "F");
              doc.setFontSize(codeFontSize);
              doc.setFont("courier", "normal");
              currentY += 3;
              codeLines.forEach((line: string) => {
                doc.text(line, margin + 4, currentY);
                currentY += codeLh;
              });
            }
            currentY += 4;
            break;

          case "hr":
            currentY += 4;
            checkPageBreak(4);
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.line(margin, currentY, margin + contentWidth, currentY);
            currentY += 4;
            break;

          case "br":
            currentY += 3;
            break;

          case "table":
            currentY += 3;
            const rows = elem.querySelectorAll("tr");
            rows.forEach((row) => {
              checkPageBreak(7);
              const cells = row.querySelectorAll("th, td");
              const cellWidth = contentWidth / Math.max(cells.length, 1);
              cells.forEach((cell, cellIdx) => {
                const cellText = (cell.textContent?.trim() || "").substring(
                  0,
                  35
                );
                const isHeader = cell.tagName.toLowerCase() === "th";
                doc.setFontSize(9);
                doc.setFont("helvetica", isHeader ? "bold" : "normal");
                doc.text(cellText, margin + cellIdx * cellWidth, currentY);
              });
              currentY += 6;
            });
            currentY += 3;
            break;

          default:
            // Process children for container elements
            if (elem.children.length > 0) {
              Array.from(elem.children).forEach(processElement);
            } else if (elem.textContent?.trim()) {
              renderText(elem.textContent.trim(), 11, "normal");
              currentY += 2;
            }
        }
      };

      // Process all children
      onProgress?.(50);
      Array.from(clonedElement.children).forEach((child, idx, arr) => {
        processElement(child);
        onProgress?.(50 + Math.floor((idx / arr.length) * 40));
      });

      onProgress?.(95);
      doc.save(filename);
      onProgress?.(100);
    },
    []
  );

  /**
   * Main export function with smart method selection
   */
  const exportPDF = useCallback(
    async (
      elementId: string,
      filename: string,
      options: ExportOptions = {}
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

        let selectedMethod: "print" | "jspdf" = "jspdf";

        if (method === "auto") {
          // Auto-detect: use print for complex content
          const hasComplex =
            element.querySelector(
              "svg, canvas, .mermaid, .diagram, [data-type='diagram']"
            ) !== null;
          selectedMethod = hasComplex ? "print" : "jspdf";
        } else {
          selectedMethod = method === "print" ? "print" : "jspdf";
        }

        if (selectedMethod === "print") {
          await printExport(elementId, title, progressHandler);
        } else {
          try {
            await jspdfExport(elementId, filename, title, progressHandler);
          } catch (jspdfError) {
            console.warn(
              "jsPDF export failed, falling back to print:",
              jspdfError
            );
            await printExport(elementId, title, progressHandler);
          }
        }
      } catch (error) {
        console.error("PDF export failed:", error);
        alert(
          "PDF export failed. Please try using your browser's print function (Ctrl+P or Cmd+P) and save as PDF.\n\n" +
            "Error: " +
            (error instanceof Error ? error.message : String(error))
        );
      } finally {
        setIsLoading(false);
        setProgress(0);
      }
    },
    [printExport, jspdfExport]
  );

  // Legacy function for backwards compatibility
  const generatePDF = useCallback(
    async (elementId: string, filename: string, title?: string) => {
      await exportPDF(elementId, filename, { method: "auto", title });
    },
    [exportPDF]
  );

  return {
    generatePDF,
    exportPDF,
    isLoading,
    progress,
  };
}
