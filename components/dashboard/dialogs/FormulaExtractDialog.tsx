"use client";

import { useState, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
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
  const extractFormula = useAction(api.ai.extractFormulaFromImage);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/png");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedLatex, setExtractedLatex] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<"high" | "medium" | "low" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editedLatex, setEditedLatex] = useState<string>("");

  const resetState = () => {
    setImagePreview(null);
    setImageBase64(null);
    setExtractedLatex(null);
    setDescription(null);
    setConfidence(null);
    setError(null);
    setRequiresUpgrade(false);
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
    setRequiresUpgrade(false);

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
    setRequiresUpgrade(false);

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
        if (result.requiresUpgrade) {
          setRequiresUpgrade(true);
        }
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
      <DialogContent className="sm:max-w-[600px] bg-[#0A0A0A] border-white/10 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            Extract Formula from Image
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Upload an image containing a mathematical formula. AI will convert
            it to LaTeX.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Upgrade Banner for free users */}
          {requiresUpgrade && (
            <div className="p-4 bg-linear-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-white mb-1">
                    Scholar Feature
                  </h4>
                  <p className="text-xs text-gray-400 mb-3">
                    Advanced Formula Recognition is available on the Scholar
                    plan. Extract formulas from images, handwritten equations,
                    and more.
                  </p>
                  <Link href="/#pricing">
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-500 text-white"
                    >
                      <Crown className="w-3 h-3 mr-1" />
                      Upgrade to Scholar
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Image Upload Zone */}
          {!extractedLatex && !requiresUpgrade && (
            <div
              {...getRootProps()}
              className={cn(
                "relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                isDragActive
                  ? "border-purple-500 bg-purple-500/10"
                  : imagePreview
                    ? "border-purple-500/30 bg-purple-500/5"
                    : "border-white/10 hover:border-purple-500/50 hover:bg-purple-500/5"
              )}
            >
              <input {...getInputProps()} />

              {imagePreview ? (
                <div className="space-y-4">
                  <img
                    src={imagePreview}
                    alt="Uploaded formula"
                    className="max-h-48 mx-auto rounded-lg border border-white/10"
                  />
                  <p className="text-sm text-gray-400">
                    Click or drop to replace image
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-xl bg-white/5 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-300 font-medium">
                      {isDragActive
                        ? "Drop the image here"
                        : "Drag and drop an image, or click to select"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, GIF, WebP up to 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Extracted Formula Display */}
          {extractedLatex && !requiresUpgrade && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">
                    Extracted Formula
                  </span>
                  {getConfidenceBadge()}
                </div>
                <div
                  className="text-center text-white text-xl overflow-x-auto py-4"
                  dangerouslySetInnerHTML={{
                    __html: renderLatex(editedLatex),
                  }}
                />
                {description && (
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    {description}
                  </p>
                )}
              </div>

              {/* Editable LaTeX */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-500 uppercase tracking-wider">
                    LaTeX Code (editable)
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-7 text-xs text-gray-400 hover:text-white"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <textarea
                  value={editedLatex}
                  onChange={(e) => setEditedLatex(e.target.value)}
                  className="w-full h-24 p-3 rounded-lg bg-black/50 border border-white/10 text-gray-200 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder="LaTeX formula..."
                />
              </div>

              {/* Try another image */}
              <button
                onClick={resetState}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                Try another image
              </button>
            </div>
          )}

          {/* Error Display */}
          {error && !requiresUpgrade && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-400">{error}</p>
                {imagePreview && (
                  <button
                    onClick={handleExtract}
                    className="text-sm text-red-300 hover:text-red-200 mt-2 underline"
                  >
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            Cancel
          </Button>

          {!extractedLatex && !requiresUpgrade && (
            <Button
              onClick={handleExtract}
              disabled={!imageBase64 || isExtracting}
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Extract Formula
                </>
              )}
            </Button>
          )}

          {extractedLatex && !requiresUpgrade && (
            <Button
              onClick={handleInsert}
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              Insert Formula
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
