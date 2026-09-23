"use client";

import { useState, useCallback } from "react";
import { useAiActions } from "@/lib/hooks/ai/useAiActions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  Crown,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import Link from "next/link";
import "katex/dist/katex.min.css";
import katex from "katex";

interface FormulaExtractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFormulaExtracted: (latex: string) => void;
}

export function FormulaExtractDialog({
  open,
  onOpenChange,
  onFormulaExtracted,
}: FormulaExtractDialogProps) {
  const { extractFormulaFromImage: extractFormula } = useAiActions();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/png");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedLatex, setExtractedLatex] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<"high" | "medium" | "low" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editedLatex, setEditedLatex] = useState<string>("");

  const resetState = () => {
    setImagePreview(null);
    setImageBase64(null);
    setExtractedLatex(null);
    setDescription(null);
    setConfidence(null);
    setError(null);
    setEditedLatex("");
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetState, 300);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setMimeType(file.type);
    setError(null);
    setExtractedLatex(null);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleExtract = async () => {
    if (!imageBase64) return;

    setIsExtracting(true);
    setError(null);

    try {
      const result = await extractFormula({
        imageBase64,
        mimeType,
      });

      if (result.success && result.latex) {
        setExtractedLatex(result.latex);
        setEditedLatex(result.latex);
        setDescription(result.description || null);
        setConfidence(result.confidence || null);
      } else {
        setError(result.error || "Failed to extract formula");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to extract formula"
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleInsert = () => {
    if (editedLatex) {
      onFormulaExtracted(editedLatex);
      handleClose();
    }
  };

  const handleCopy = () => {
    if (editedLatex) {
      navigator.clipboard.writeText(editedLatex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Render LaTeX preview
  const renderLatex = (latex: string) => {
    try {
      // Remove $$ or $ delimiters for rendering
      const cleanLatex = latex
        .replace(/^\$\$/, "")
        .replace(/\$\$$/, "")
        .replace(/^\$/, "")
        .replace(/\$$/, "")
        .trim();

      return katex.renderToString(cleanLatex, {
        throwOnError: false,
        displayMode: true,
      });
    } catch {
      return `<span class="text-red-400">Invalid LaTeX</span>`;
    }
  };

  const getConfidenceBadge = () => {
    if (!confidence) return null;

    const styles = {
      high: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      low: "bg-red-500/20 text-red-400 border-red-500/30",
    };

    return (
      <span
        className={cn(
          "px-2 py-0.5 text-[10px] font-medium rounded-full border",
          styles[confidence]
        )}
      >
        {confidence} confidence
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] bg-background border-border text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2.5 bg-linear-to-br from-primary/20 to-primary-alt/20 rounded-xl border border-primary/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl">Extract Formula from Image</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground mt-2">
            Upload an image containing a mathematical formula. Our AI will convert
            it to LaTeX code automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Loading State */}
          {isExtracting && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-purple-500 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground/80">Extracting formula...</p>
                <p className="text-xs text-muted-foreground/80 mt-1">This may take a few seconds</p>
              </div>
            </div>
          )}

          {/* Image Upload Zone */}
          {!extractedLatex && !isExtracting && (
            <div
              {...getRootProps()}
              className={cn(
                "relative border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer group",
                isDragActive
                  ? "border-primary bg-primary/10 scale-[1.02]"
                  : imagePreview
                    ? "border-primary/40 bg-primary/5"
                    : "border-border hover:border-primary/60 hover:bg-primary/5"
              )}
            >
              <input {...getInputProps()} />

              {imagePreview ? (
                <div className="space-y-4">
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Uploaded formula"
                      className="max-h-56 mx-auto rounded-xl border-2 border-border shadow-lg"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground/80">
                      Image ready for extraction
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      Click or drop to replace image
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-linear-to-br from-primary/10 to-primary-alt/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-foreground/90 mb-1">
                      {isDragActive
                        ? "Drop the image here"
                        : "Drag and drop an image, or click to select"}
                    </p>
                    <p className="text-xs text-muted-foreground/80">
                      Supports PNG, JPG, GIF, WebP • Max 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Extracted Formula Display */}
          {extractedLatex && !isExtracting && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Preview */}
              <div className="bg-linear-to-br from-foreground/5 to-foreground/2 rounded-xl p-6 border border-border shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Extracted Formula
                  </span>
                  {getConfidenceBadge()}
                </div>
                <div className="bg-inset rounded-lg p-6 border border-border/60">
                  <div
                    className="text-center text-foreground text-2xl overflow-x-auto py-3 min-h-[60px] flex items-center justify-center"
                    dangerouslySetInnerHTML={{
                      __html: renderLatex(editedLatex),
                    }}
                  />
                </div>
                {description && (
                  <p className="text-xs text-muted-foreground mt-4 text-center italic">
                    {description}
                  </p>
                )}
              </div>

              {/* Editable LaTeX */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    LaTeX Code
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <textarea
                  value={editedLatex}
                  onChange={(e) => setEditedLatex(e.target.value)}
                  className="w-full h-28 p-4 rounded-lg bg-inset border border-border text-foreground/90 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all"
                  placeholder="LaTeX formula..."
                />
                <p className="text-xs text-muted-foreground/80">
                  Edit the LaTeX code above if needed
                </p>
              </div>

              {/* Try another image */}
              <div className="flex items-center justify-center pt-2">
                <button
                  onClick={resetState}
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-2 group"
                >
                  <ImageIcon className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  Try another image
                </button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && !isExtracting && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
              <div className="p-1.5 bg-red-500/20 rounded-lg shrink-0">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-400 mb-1">{error}</p>
                {imagePreview && (
                  <button
                    onClick={handleExtract}
                    className="text-xs text-red-300 hover:text-red-200 mt-2 font-medium underline decoration-red-300/50 hover:decoration-red-200 transition-colors"
                  >
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground hover:bg-foreground/5"
            disabled={isExtracting}
          >
            Cancel
          </Button>

          {!extractedLatex && !isExtracting && (
            <Button
              onClick={handleExtract}
              disabled={!imageBase64 || isExtracting}
              className="bg-linear-to-r from-primary to-primary-alt hover:from-primary/90 hover:to-primary-alt/90 text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Extract Formula
            </Button>
          )}

          {extractedLatex && !isExtracting && (
            <Button
              onClick={handleInsert}
              className="bg-linear-to-r from-primary to-primary-alt hover:from-primary/90 hover:to-primary-alt/90 text-primary-foreground shadow-lg shadow-primary/20"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Insert Formula
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
