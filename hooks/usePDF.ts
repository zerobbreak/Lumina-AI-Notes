import { useCallback, useState } from "react";

export function usePDF() {
  const [isLoading, setIsLoading] = useState(false);

  const generatePDF = useCallback(
    async (elementId: string, filename: string, title?: string) => {
      setIsLoading(true);
      try {
        const { jsPDF } = await import("jspdf");

        const element = document.getElementById(elementId);
        if (!element) throw new Error("Element not found");

        // Get the HTML content from the element
        const htmlContent = element.innerHTML;

        // Create a hidden iframe to render content with clean styles
        const iframe = document.createElement("iframe");
        iframe.style.position = "absolute";
        iframe.style.left = "-9999px";
        iframe.style.top = "-9999px";
        iframe.style.width = "794px"; // A4 width at 96 DPI
        iframe.style.height = "1123px"; // A4 height at 96 DPI
        document.body.appendChild(iframe);

        const iframeDoc =
          iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) throw new Error("Could not access iframe document");

        // Write clean HTML with simple CSS (no modern color functions)
        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  line-height: 1.7;
                  padding: 40px;
                  color: #1a1a1a;
                  background: #ffffff;
                  font-size: 14px;
                }
                h1 { font-size: 28px; font-weight: 700; margin: 0 0 24px 0; color: #111; }
                h2 { font-size: 22px; font-weight: 600; margin: 24px 0 12px 0; color: #222; }
                h3 { font-size: 18px; font-weight: 600; margin: 20px 0 10px 0; color: #333; }
                p { margin: 12px 0; }
                ul, ol { padding-left: 24px; margin: 12px 0; }
                li { margin: 6px 0; }
                strong, b { font-weight: 600; }
                em, i { font-style: italic; }
                code {
                  background: #f4f4f4;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-family: 'SF Mono', Monaco, 'Courier New', monospace;
                  font-size: 13px;
                }
                pre {
                  background: #f4f4f4;
                  padding: 16px;
                  border-radius: 8px;
                  overflow-x: auto;
                  margin: 16px 0;
                }
                blockquote {
                  border-left: 4px solid #ddd;
                  padding-left: 16px;
                  margin: 16px 0;
                  color: #555;
                  font-style: italic;
                }
                hr { border: none; border-top: 1px solid #eee; margin: 24px 0; }
                a { color: #0066cc; text-decoration: none; }
                .ProseMirror { outline: none; }
                .ProseMirror > * + * { margin-top: 0.75em; }
              </style>
            </head>
            <body>
              ${title ? `<h1>${title}</h1>` : ""}
              ${htmlContent}
            </body>
          </html>
        `);
        iframeDoc.close();

        // Wait for content to render
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Use html2canvas on the clean iframe content
        const html2canvas = (await import("html2canvas")).default;
        const canvas = await html2canvas(iframeDoc.body, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });

        // Clean up iframe
        document.body.removeChild(iframe);

        const imgData = canvas.toDataURL("image/png");
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(filename);
      } catch (error) {
        console.error("PDF generation failed:", error);
        // Fallback to browser print
        window.print();
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { generatePDF, isLoading };
}
