import { useCallback, useState } from "react";

export function usePDF() {
  const [isLoading, setIsLoading] = useState(false);

  const generatePDF = useCallback(
    async (elementId: string, filename: string, title?: string) => {
      setIsLoading(true);
      try {
        const { jsPDF } = await import("jspdf");
        const html2canvas = (await import("html2canvas")).default;

        const element = document.getElementById(elementId);
        if (!element) throw new Error("Element not found");

        // Clone the element to avoid modifying the original
        const clonedElement = element.cloneNode(true) as HTMLElement;
        
        // Remove elements that shouldn't be in the PDF
        clonedElement.querySelectorAll('[data-html2canvas-ignore]').forEach(el => el.remove());
        clonedElement.querySelectorAll('.ProseMirror-gapcursor').forEach(el => el.remove());
        clonedElement.querySelectorAll('[contenteditable]').forEach(el => {
          el.removeAttribute('contenteditable');
        });

        // Get the HTML content
        let htmlContent = clonedElement.innerHTML;
        
        // Clean up the HTML - remove empty paragraphs and unnecessary elements
        htmlContent = htmlContent
          .replace(/<p><\/p>/g, '')
          .replace(/<p>\s*<\/p>/g, '')
          .replace(/data-html2canvas-ignore="[^"]*"/g, '')
          .replace(/contenteditable="[^"]*"/g, '');

        // Create a temporary container with clean, print-friendly styles
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '794px'; // A4 width in pixels at 96 DPI
        container.style.minHeight = '1123px'; // A4 height in pixels at 96 DPI
        container.style.backgroundColor = '#ffffff';
        container.style.color = '#000000';
        
        // Apply comprehensive styles for PDF export with better visibility
        container.innerHTML = `
          <style>
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
            * { 
              margin: 0; 
              padding: 0; 
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .pdf-content {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #000000 !important;
              padding: 40px;
              background: #ffffff !important;
              width: 794px;
              min-height: 1123px;
            }
            .pdf-content * {
              color: #000000 !important;
              background: transparent !important;
            }
            .pdf-content h1 {
              font-size: 28px;
              font-weight: 700;
              margin: 0 0 24px 0;
              color: #000000 !important;
              border-bottom: 3px solid #000000;
              padding-bottom: 12px;
              line-height: 1.3;
            }
            .pdf-content h2 {
              font-size: 22px;
              font-weight: 600;
              margin: 24px 0 14px 0;
              color: #000000 !important;
              line-height: 1.4;
            }
            .pdf-content h3 {
              font-size: 18px;
              font-weight: 600;
              margin: 20px 0 12px 0;
              color: #000000 !important;
              line-height: 1.4;
            }
            .pdf-content h4 {
              font-size: 16px;
              font-weight: 600;
              margin: 16px 0 10px 0;
              color: #000000 !important;
              line-height: 1.4;
            }
            .pdf-content p {
              margin: 12px 0;
              color: #000000 !important;
              line-height: 1.6;
            }
            .pdf-content ul, .pdf-content ol {
              margin: 12px 0;
              padding-left: 32px;
            }
            .pdf-content li {
              margin: 8px 0;
              color: #000000 !important;
              line-height: 1.6;
            }
            .pdf-content strong, .pdf-content b {
              font-weight: 700;
              color: #000000 !important;
            }
            .pdf-content em, .pdf-content i {
              font-style: italic;
              color: #000000 !important;
            }
            .pdf-content code {
              background: #f0f0f0 !important;
              padding: 3px 8px;
              border-radius: 4px;
              font-family: 'Courier New', Courier, monospace;
              font-size: 13px;
              color: #000000 !important;
              border: 1px solid #d0d0d0;
            }
            .pdf-content pre {
              background: #f5f5f5 !important;
              padding: 16px;
              border-radius: 6px;
              overflow-x: auto;
              margin: 16px 0;
              border: 1px solid #d0d0d0;
            }
            .pdf-content pre code {
              background: transparent !important;
              padding: 0;
              border: none;
            }
            .pdf-content blockquote {
              border-left: 4px solid #000000;
              padding-left: 20px;
              margin: 16px 0;
              color: #000000 !important;
              font-style: italic;
            }
            .pdf-content hr {
              border: none;
              border-top: 2px solid #cccccc;
              margin: 24px 0;
            }
            .pdf-content a {
              color: #000000 !important;
              text-decoration: underline;
            }
            .pdf-content table {
              border-collapse: collapse;
              width: 100%;
              margin: 16px 0;
            }
            .pdf-content th, .pdf-content td {
              border: 1px solid #000000;
              padding: 10px;
              text-align: left;
              color: #000000 !important;
            }
            .pdf-content th {
              background-color: #e0e0e0 !important;
              font-weight: 700;
            }
            /* Ensure ProseMirror content is visible */
            .pdf-content .ProseMirror,
            .pdf-content .ProseMirror * {
              color: #000000 !important;
              background: transparent !important;
            }
            /* Remove any dark mode or colored backgrounds */
            .pdf-content [class*="dark"],
            .pdf-content [class*="bg-"],
            .pdf-content [style*="background"],
            .pdf-content [style*="color"] {
              background: transparent !important;
              color: #000000 !important;
            }
          </style>
          <div class="pdf-content">
            ${title ? `<h1>${title}</h1>` : ''}
            ${htmlContent}
          </div>
        `;
        
        document.body.appendChild(container);

        // Wait for content to render and fonts to load
        await new Promise(resolve => setTimeout(resolve, 500));

        // Get the content element
        const contentElement = container.querySelector('.pdf-content') as HTMLElement;
        if (!contentElement) throw new Error("Content element not found");

        // Force all text to be black
        const allElements = contentElement.querySelectorAll('*');
        allElements.forEach((el: Element) => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.color = '#000000';
          htmlEl.style.backgroundColor = 'transparent';
        });

        // Calculate dimensions
        const contentHeight = contentElement.scrollHeight;
        const contentWidth = contentElement.scrollWidth;
        
        // Create canvas with higher quality settings
        const canvas = await html2canvas(contentElement, {
          scale: 3, // Higher scale for better quality
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: contentWidth,
          height: contentHeight,
          windowWidth: contentWidth,
          windowHeight: contentHeight,
          scrollY: -window.scrollY,
          scrollX: -window.scrollX,
          onclone: (clonedDoc) => {
            // Ensure all text is black in the cloned document
            const clonedContent = clonedDoc.querySelector('.pdf-content');
            if (clonedContent) {
              const allEls = clonedContent.querySelectorAll('*');
              allEls.forEach((el: Element) => {
                const htmlEl = el as HTMLElement;
                htmlEl.style.color = '#000000';
                htmlEl.style.backgroundColor = 'transparent';
              });
            }
          }
        });

        // Clean up the temporary container
        document.body.removeChild(container);

        // PDF dimensions (A4)
        const pdfWidth = 210; // mm
        const pdfHeight = 297; // mm
        const margin = 15; // mm
        const contentWidthMM = pdfWidth - (2 * margin);
        
        // Calculate image dimensions
        const imgWidth = contentWidthMM;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Create PDF
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        // Use PNG for better quality with text
        const imgData = canvas.toDataURL('image/png', 1.0);
        
        // Calculate how many pages we need
        const pageContentHeight = pdfHeight - (2 * margin);
        let heightLeft = imgHeight;
        let position = margin;
        let page = 1;

        // Add first page
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageContentHeight;

        // Add additional pages if needed
        while (heightLeft > 0) {
          position = -(pageContentHeight * page) + margin;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
          heightLeft -= pageContentHeight;
          page++;
        }

        // Save the PDF
        pdf.save(filename);
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
