import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { getRectOfNodes, getTransformForBounds } from "@xyflow/react";
import { ExportOptions } from "./types";

/**
 * Export the diagram to PNG
 */
export async function exportToPNG(
  element: HTMLElement,
  options: ExportOptions
): Promise<void> {
  const {
    fileName = "mindmap.png",
    backgroundColor = "#050505",
    quality = 1,
  } = options;

  try {
    const canvas = await html2canvas(element, {
      backgroundColor,
      scale: quality * 2,
      logging: false,
      useCORS: true,
    });

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      }
    }, "image/png");
  } catch (error) {
    console.error("Failed to export PNG:", error);
    throw error;
  }
}

/**
 * Export the diagram to PDF
 */
export async function exportToPDF(
  element: HTMLElement,
  options: ExportOptions
): Promise<void> {
  const { fileName = "mindmap.pdf", backgroundColor = "#050505" } = options;

  try {
    const canvas = await html2canvas(element, {
      backgroundColor,
      scale: 2,
      logging: false,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? "landscape" : "portrait",
      unit: "px",
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(fileName);
  } catch (error) {
    console.error("Failed to export PDF:", error);
    throw error;
  }
}

/**
 * Export the diagram to SVG
 */
export async function exportToSVG(
  element: HTMLElement,
  options: ExportOptions
): Promise<void> {
  const { fileName = "mindmap.svg", backgroundColor = "#050505" } = options;

  try {
    // Clone the element
    const clone = element.cloneNode(true) as HTMLElement;
    
    // Get dimensions
    const rect = element.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Create SVG
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", width.toString());
    svg.setAttribute("height", height.toString());
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    // Add background
    const background = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    background.setAttribute("width", "100%");
    background.setAttribute("height", "100%");
    background.setAttribute("fill", backgroundColor);
    svg.appendChild(background);

    // Convert HTML to foreignObject
    const foreignObject = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "foreignObject"
    );
    foreignObject.setAttribute("width", "100%");
    foreignObject.setAttribute("height", "100%");
    foreignObject.appendChild(clone);
    svg.appendChild(foreignObject);

    // Serialize and download
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to export SVG:", error);
    throw error;
  }
}

/**
 * Download diagram data as JSON
 */
export function exportToJSON(
  nodes: any[],
  edges: any[],
  fileName = "mindmap.json"
): void {
  const data = {
    nodes,
    edges,
    version: "1.0",
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}



