/**
 * Tests for usePDF hook - Hybrid PDF export functionality
 *
 * These tests verify the hook's basic structure and error handling.
 * Full integration testing should be done manually or with E2E tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePDF } from "@/hooks/usePDF";

describe("usePDF Hook - Hybrid Approach", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // Create a test container
    container = document.createElement("div");
    container.id = "test-content";
    container.innerHTML = `
      <div>
        <h1>Test Title</h1>
        <p>Test paragraph with content.</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      </div>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Cleanup
    if (container && document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  describe("Hook Structure", () => {
    it("should initialize with loading state as false", () => {
      const { result } = renderHook(() => usePDF());

      expect(result.current.isLoading).toBe(false);
    });

    it("should expose generatePDF function", () => {
      const { result } = renderHook(() => usePDF());

      expect(result.current.generatePDF).toBeDefined();
      expect(typeof result.current.generatePDF).toBe("function");
    });

    it("should have correct return type structure", () => {
      const { result } = renderHook(() => usePDF());

      expect(result.current).toHaveProperty("generatePDF");
      expect(result.current).toHaveProperty("isLoading");
      expect(typeof result.current.isLoading).toBe("boolean");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing element gracefully", async () => {
      const { result } = renderHook(() => usePDF());

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      await result.current.generatePDF(
        "non-existent-element",
        "test.pdf",
        "Test Document"
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "PDF export failed:",
        expect.any(Error)
      );
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining("PDF export failed")
      );
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("Ctrl+P"));

      consoleErrorSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it("should reset loading state on error", async () => {
      const { result } = renderHook(() => usePDF());

      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(window, "alert").mockImplementation(() => {});

      await result.current.generatePDF(
        "non-existent-element",
        "test.pdf",
        "Test Document"
      );

      // Wait a bit for state to update
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("Content Processing", () => {
    it("should not modify original DOM element", async () => {
      const { result } = renderHook(() => usePDF());
      const originalHTML = container.innerHTML;

      vi.spyOn(console, "error").mockImplementation(() => {});

      // This will fail to generate PDF but should not modify DOM
      try {
        await result.current.generatePDF(
          "test-content",
          "test.pdf",
          "Test Document"
        );
      } catch {
        // Expected to fail in test environment
      }

      // Original content should be unchanged
      expect(container.innerHTML).toBe(originalHTML);
    });
  });
});
