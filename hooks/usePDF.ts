import { useCallback, useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

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

interface RenderContext {
  doc: jsPDF;
  metrics: PageMetrics;
  currentY: number;
  fontSize: number;
  lineHeight: number;
}

export function usePDF() {
  const [isLoading, setIsLoading] = useState(false);

  const generatePDF = useCallback(
    async (elementId: string, filename: string, title?: string) => {
      setIsLoading(true);
      
      // Yield to browser
      await new Promise(resolve => setTimeout(resolve, 0));
      
      try {
        const element = document.getElementById(elementId);
        if (!element) throw new Error("Element not found");

        // Clone element to avoid modifying original
        const clonedElement = element.cloneNode(true) as HTMLElement;
        
        // Clean up the clone
        clonedElement.querySelectorAll('[data-html2canvas-ignore]').forEach(el => el.remove());
        clonedElement.querySelectorAll('.ProseMirror-gapcursor').forEach(el => el.remove());
        clonedElement.querySelectorAll('[contenteditable]').forEach(el => {
          el.removeAttribute('contenteditable');
        });

        // Create temporary container for processing
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-99999px';
        container.style.top = '0';
        container.style.width = '210mm'; // A4 width
        container.style.visibility = 'hidden';
        container.appendChild(clonedElement);
        document.body.appendChild(container);

        // Wait for rendering
        await new Promise(resolve => setTimeout(resolve, 100));

        // Initialize PDF
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true,
        });

        // Set up page metrics
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const marginLeft = 15;
        const marginRight = 15;
        const marginTop = 15;
        const marginBottom = 15;

        const metrics: PageMetrics = {
          width: pageWidth,
          height: pageHeight,
          marginLeft,
          marginRight,
          marginTop,
          marginBottom,
          contentWidth: pageWidth - marginLeft - marginRight,
          contentHeight: pageHeight - marginTop - marginBottom,
        };

        // Initialize render context
        const ctx: RenderContext = {
          doc,
          metrics,
          currentY: marginTop,
          fontSize: 12,
          lineHeight: 1.5,
        };

        /**
         * Determine if an element should be rendered as canvas (complex) or text (simple)
         */
        const shouldUseCanvas = (elem: Element): boolean => {
          const tagName = elem.tagName.toLowerCase();
          const classList = Array.from(elem.classList);

          // Complex elements that need canvas rendering
          const canvasElements = ['svg', 'canvas', 'img'];

          // Check for specific classes that indicate complex rendering
          const canvasClasses = ['mermaid', 'diagram', 'react-flow', 'katex-display'];

          return (
            canvasElements.includes(tagName) ||
            classList.some(cls => canvasClasses.some(cc => cls.includes(cc)))
          );
        };

        /**
         * Check if we need a new page
         */
        const checkPageBreak = (requiredHeight: number): void => {
          if (ctx.currentY + requiredHeight > ctx.metrics.contentHeight) {
            ctx.doc.addPage();
            ctx.currentY = ctx.metrics.marginTop;
          }
        };

        /**
         * Render text with word wrapping
         */
        const renderText = (
          text: string,
          options: {
            fontSize?: number;
            fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
            align?: 'left' | 'center' | 'right' | 'justify';
            color?: [number, number, number];
            indent?: number;
          } = {}
        ): void => {
          const {
            fontSize = ctx.fontSize,
            fontStyle = 'normal',
            align = 'left',
            color = [0, 0, 0],
            indent = 0,
          } = options;

          ctx.doc.setFontSize(fontSize);
          ctx.doc.setFont('helvetica', fontStyle);
          ctx.doc.setTextColor(color[0], color[1], color[2]);

          const maxWidth = ctx.metrics.contentWidth - indent;
          const lines = ctx.doc.splitTextToSize(text, maxWidth);
          const lineHeight = fontSize * ctx.lineHeight;

          for (const line of lines) {
            checkPageBreak(lineHeight);
            
            const x = ctx.metrics.marginLeft + indent;
            ctx.doc.text(line, x, ctx.currentY, { align });
            ctx.currentY += lineHeight;
          }
        };

        /**
         * Render a heading
         */
        const renderHeading = (elem: Element, level: number): void => {
          const text = elem.textContent?.trim() || '';
          if (!text) return;

          const fontSizes = [24, 20, 16, 14, 12, 11];
          const fontSize = fontSizes[level - 1] || 12;
          const spaceBefore = level === 1 ? 20 : 12;
          const spaceAfter = 8;

          // Add space before heading (but not on first page at top)
          if (ctx.currentY > ctx.metrics.marginTop) {
            ctx.currentY += spaceBefore;
          }

          // Ensure heading stays with next content (orphan control)
          const headingHeight = fontSize * ctx.lineHeight + spaceAfter;
          const minContentHeight = 30; // Minimum content to keep with heading
          checkPageBreak(headingHeight + minContentHeight);

          renderText(text, {
            fontSize,
            fontStyle: 'bold',
            color: [0, 0, 0],
          });

          ctx.currentY += spaceAfter;
        };

        /**
         * Render a paragraph
         */
        const renderParagraph = (elem: Element): void => {
          const text = elem.textContent?.trim() || '';
          if (!text) return;

          const spaceBefore = 6;
          ctx.currentY += spaceBefore;

          renderText(text, {
            fontSize: 12,
            fontStyle: 'normal',
          });
        };

        /**
         * Render a list (ul or ol)
         */
        const renderList = (elem: Element, ordered: boolean = false): void => {
          const items = Array.from(elem.querySelectorAll(':scope > li'));
          if (items.length === 0) return;

          const spaceBefore = 6;
          const indent = 15;
          const bulletWidth = 10;

          ctx.currentY += spaceBefore;

          items.forEach((item, index) => {
            const text = item.textContent?.trim() || '';
            if (!text) return;

            const bullet = ordered ? `${index + 1}.` : '•';
            const lineHeight = 12 * ctx.lineHeight;

            checkPageBreak(lineHeight);

            // Render bullet/number
            ctx.doc.setFontSize(12);
            ctx.doc.setFont('helvetica', 'normal');
            ctx.doc.text(bullet, ctx.metrics.marginLeft + indent - bulletWidth, ctx.currentY);

            // Render text with indent
            renderText(text, {
              fontSize: 12,
              indent: indent,
            });

            // Add small space between list items
            ctx.currentY += 2;
          });
        };

        /**
         * Render a blockquote
         */
        const renderBlockquote = (elem: Element): void => {
          const text = elem.textContent?.trim() || '';
          if (!text) return;

          const spaceBefore = 8;
          const indent = 20;
          const borderWidth = 3;

          ctx.currentY += spaceBefore;

          // Save position for border
          const startY = ctx.currentY;

          // Render text with indent
          renderText(text, {
            fontSize: 12,
            fontStyle: 'italic',
            color: [60, 60, 60],
            indent: indent,
          });

          // Draw left border
          ctx.doc.setDrawColor(0, 0, 0);
          ctx.doc.setLineWidth(borderWidth);
          ctx.doc.line(
            ctx.metrics.marginLeft + indent - 10,
            startY,
            ctx.metrics.marginLeft + indent - 10,
            ctx.currentY
          );

          ctx.currentY += 6;
        };

        /**
         * Render a table using manual jsPDF drawing
         */
        const renderTable = (elem: Element): void => {
          const rows = Array.from(elem.querySelectorAll('tr'));
          if (rows.length === 0) return;

          const spaceBefore = 8;
          ctx.currentY += spaceBefore;

          // Extract headers and body
          const headers: string[] = [];
          const body: string[][] = [];

          rows.forEach((row, rowIndex) => {
            const cells = Array.from(row.querySelectorAll('th, td'));
            const cellTexts = cells.map(cell => cell.textContent?.trim() || '');

            if (rowIndex === 0 && cells[0]?.tagName.toLowerCase() === 'th') {
              headers.push(...cellTexts);
            } else {
              body.push(cellTexts);
            }
          });

          const allRows = headers.length > 0 ? [headers, ...body] : body;
          if (allRows.length === 0) return;

          // Calculate column widths
          const numCols = Math.max(...allRows.map(row => row.length));
          const colWidth = ctx.metrics.contentWidth / numCols;
          const rowHeight = 8;
          const cellPadding = 2;

          checkPageBreak(rowHeight * Math.min(allRows.length, 3)); // Ensure some space

          // Draw table
          allRows.forEach((row, rowIndex) => {
            const isHeader = headers.length > 0 && rowIndex === 0;
            
            // Check if we need a new page
            checkPageBreak(rowHeight);

            // Draw cell backgrounds
            if (isHeader) {
              ctx.doc.setFillColor(220, 220, 220);
              ctx.doc.rect(
                ctx.metrics.marginLeft,
                ctx.currentY,
                ctx.metrics.contentWidth,
                rowHeight,
                'F'
              );
            }

            // Draw cell borders and text
            row.forEach((cell, colIndex) => {
              const x = ctx.metrics.marginLeft + colIndex * colWidth;
              
              // Draw cell border
              ctx.doc.setDrawColor(0, 0, 0);
              ctx.doc.setLineWidth(0.1);
              ctx.doc.rect(x, ctx.currentY, colWidth, rowHeight, 'S');

              // Draw cell text
              ctx.doc.setFontSize(9);
              ctx.doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
              ctx.doc.setTextColor(0, 0, 0);
              
              // Truncate text if too long
              const maxWidth = colWidth - cellPadding * 2;
              const lines = ctx.doc.splitTextToSize(cell, maxWidth);
              const textY = ctx.currentY + rowHeight / 2 + 2;
              
              ctx.doc.text(lines[0] || '', x + cellPadding, textY);
            });

            ctx.currentY += rowHeight;
          });

          ctx.currentY += 8; // Space after table
        };

        /**
         * Render a code block
         */
        const renderCodeBlock = (elem: Element): void => {
          const code = elem.textContent?.trim() || '';
          if (!code) return;

          const spaceBefore = 8;
          const padding = 8;

          ctx.currentY += spaceBefore;

          // Calculate code block height
          ctx.doc.setFontSize(9);
          const lines = ctx.doc.splitTextToSize(code, ctx.metrics.contentWidth - padding * 2);
          const blockHeight = lines.length * 9 * ctx.lineHeight + padding * 2;

          checkPageBreak(blockHeight);

          // Draw background
          ctx.doc.setFillColor(245, 245, 245);
          ctx.doc.rect(
            ctx.metrics.marginLeft,
            ctx.currentY,
            ctx.metrics.contentWidth,
            blockHeight,
            'F'
          );

          // Draw border
          ctx.doc.setDrawColor(200, 200, 200);
          ctx.doc.rect(
            ctx.metrics.marginLeft,
            ctx.currentY,
            ctx.metrics.contentWidth,
            blockHeight,
            'S'
          );

          // Render code text
          ctx.currentY += padding;
          ctx.doc.setFont('courier', 'normal');
          ctx.doc.setFontSize(9);
          ctx.doc.setTextColor(0, 0, 0);

          lines.forEach((line: string) => {
            ctx.doc.text(line, ctx.metrics.marginLeft + padding, ctx.currentY);
            ctx.currentY += 9 * ctx.lineHeight;
          });

          ctx.currentY += padding + 6;
        };

        /**
         * Render an element as canvas (for complex elements)
         */
        const renderAsCanvas = async (elem: Element): Promise<void> => {
          try {
            const htmlElement = elem as HTMLElement;
            
            // Create canvas from element
            const canvas = await html2canvas(htmlElement, {
              scale: 2,
              useCORS: true,
              backgroundColor: '#ffffff',
              logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = ctx.metrics.contentWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            checkPageBreak(imgHeight + 10);

            ctx.doc.addImage(
              imgData,
              'PNG',
              ctx.metrics.marginLeft,
              ctx.currentY,
              imgWidth,
              imgHeight
            );

            ctx.currentY += imgHeight + 10;
          } catch (error) {
            console.error('Failed to render element as canvas:', error);
            // Fallback: render as text
            const text = elem.textContent?.trim() || '[Complex element - rendering failed]';
            renderText(text, { fontSize: 10, color: [100, 100, 100] });
          }
        };

        /**
         * Process and render an element
         */
        const renderElement = async (elem: Element): Promise<void> => {
          const tagName = elem.tagName.toLowerCase();

          // Skip hidden elements
          if ((elem as HTMLElement).style.display === 'none') {
            return;
          }

          // Check if this element needs canvas rendering
          if (shouldUseCanvas(elem)) {
            await renderAsCanvas(elem);
            return;
          }

          // Text-based rendering
          switch (tagName) {
            case 'h1':
              renderHeading(elem, 1);
              break;
            case 'h2':
              renderHeading(elem, 2);
              break;
            case 'h3':
              renderHeading(elem, 3);
              break;
            case 'h4':
              renderHeading(elem, 4);
              break;
            case 'h5':
              renderHeading(elem, 5);
              break;
            case 'h6':
              renderHeading(elem, 6);
              break;
            case 'p':
              renderParagraph(elem);
              break;
            case 'ul':
              renderList(elem, false);
              break;
            case 'ol':
              renderList(elem, true);
              break;
            case 'blockquote':
              renderBlockquote(elem);
              break;
            case 'table':
              renderTable(elem);
              break;
            case 'pre':
              // Check if it contains a code block
              const codeElement = elem.querySelector('code');
              if (codeElement) {
                renderCodeBlock(codeElement);
              } else {
                renderCodeBlock(elem);
              }
              break;
            case 'code':
              // Inline code - render as text with monospace
              const codeText = elem.textContent?.trim() || '';
              if (codeText) {
                ctx.doc.setFont('courier', 'normal');
                ctx.doc.text(codeText, ctx.metrics.marginLeft, ctx.currentY);
                ctx.doc.setFont('helvetica', 'normal');
              }
              break;
            case 'hr':
              ctx.currentY += 10;
              ctx.doc.setDrawColor(200, 200, 200);
              ctx.doc.line(
                ctx.metrics.marginLeft,
                ctx.currentY,
                ctx.metrics.marginLeft + ctx.metrics.contentWidth,
                ctx.currentY
              );
              ctx.currentY += 10;
              break;
            case 'br':
              ctx.currentY += 12 * ctx.lineHeight;
              break;
            default:
              // For other elements, process children
              const children = Array.from(elem.children);
              if (children.length > 0) {
                for (const child of children) {
                  await renderElement(child);
                }
              } else if (elem.textContent?.trim()) {
                // Leaf element with text
                renderParagraph(elem);
              }
          }
        };

        // Add title if provided
        if (title) {
          renderText(title, {
            fontSize: 24,
            fontStyle: 'bold',
            align: 'left',
          });
          
          // Add underline
          ctx.doc.setDrawColor(0, 0, 0);
          ctx.doc.setLineWidth(0.5);
          ctx.doc.line(
            marginLeft,
            ctx.currentY + 2,
            marginLeft + metrics.contentWidth,
            ctx.currentY + 2
          );
          ctx.currentY += 12;
        }

        // Process all child elements
        const children = Array.from(clonedElement.children);
        for (const child of children) {
          await renderElement(child);
        }

        // Clean up temporary container
        document.body.removeChild(container);

        // Save PDF
        doc.save(filename);

      } catch (error) {
        console.error("PDF generation failed:", error);
        alert("PDF generation failed. Please try using your browser's print function (Ctrl+P or Cmd+P) and save as PDF.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { generatePDF, isLoading };
}
