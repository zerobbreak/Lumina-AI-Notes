"use client";

import { useState, useCallback } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/lib/uploadthing";
import {
  Loader2,
  ImageIcon,
  CheckCircle,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  Upload,
  X,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";
import katex from "katex";

type Mode = "upload" | "formula";

interface ImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageUploaded: (url: string) => void;
  onFormulaExtracted?: (latex: string) => void;
  defaultMode?: Mode;
}

export function ImageUploadDialog({
  open,
  onOpenChange,
  onImageUploaded,
  onFormulaExtracted,
  defaultMode = "upload",
}: ImageUploadDialogProps) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Formula extraction state
  const extractFormula = useAction(api.ai.extractFormulaFromImage);
  const subscription = useQuery(api.subscriptions.getSubscriptionStatus);
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

  const isFreeTier = !subscription || subscription.tier === "free";

  const resetFormulaState = () => {
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
    setTimeout(() => {
      setUploadSuccess(false);
      setMode(defaultMode);
      resetFormulaState();
    }, 300);
  };

  // Formula dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setMimeType(file.type);
    setError(null);
    setExtractedLatex(null);
    setRequiresUpgrade(false);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

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
    maxSize: 10 * 1024 * 1024,
  });

  const handleExtract = async () => {
    if (!imageBase64) return;

    setIsExtracting(true);
    setError(null);
    setRequiresUpgrade(false);

    try {
      const result = await extractFormula({ imageBase64, mimeType });

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
      setError(err instanceof Error ? err.message : "Failed to extract formula");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleInsertFormula = () => {
    if (editedLatex && onFormulaExtracted) {
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

  const renderLatex = (latex: string) => {
    try {
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
      <span className={cn("px-2 py-0.5 text-[10px] font-medium rounded-full border", styles[confidence])}>
        {confidence} confidence
      </span>
    );
  };

  // For free users, only show upload mode
  const showTabs = !isFreeTier;
  const currentMode = isFreeTier ? "upload" : mode;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#0A0A0A] border-white/10 text-white shadow-2xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-semibold text-white">
              {currentMode === "upload" ? "Upload Image" : "Extract Formula"}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              {currentMode === "upload"
                ? "Add an image to your note"
                : "Convert a formula image to LaTeX"}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Mode Tabs - Only show for Scholar users */}
        {showTabs && (
          <div className="px-6 pb-4">
            <div className="flex p-1 bg-white/5 rounded-lg border border-white/5">
              <button
                onClick={() => {
                  setMode("upload");
                  resetFormulaState();
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                  mode === "upload"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-400 hover:text-white"
                )}
              >
                <ImageIcon className="w-4 h-4" />
                Image
              </button>
              <button
                onClick={() => {
                  setMode("formula");
                  setUploadSuccess(false);
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                  mode === "formula"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-400 hover:text-white"
                )}
              >
                <Sparkles className="w-4 h-4" />
                Formula
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="px-6 pb-6">
          {/* Upload Mode */}
          {currentMode === "upload" && (
            <div>
              {uploadSuccess ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                  <p className="text-emerald-400 font-medium">Upload complete</p>
                </div>
              ) : isUploading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 bg-white/5 rounded-xl border border-white/10">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                  <p className="text-gray-400 text-sm">Uploading...</p>
                </div>
              ) : (
                <UploadDropzone
                  endpoint="imageUploader"
                  onUploadBegin={() => setIsUploading(true)}
                  onClientUploadComplete={(res) => {
                    setIsUploading(false);
                    setUploadSuccess(true);

                    if (res && res[0]) {
                      const file = res[0];
                      const url = file.ufsUrl || file.url || file.appUrl;

                      if (url) {
                        onImageUploaded(url);
                      } else {
                        alert("Upload succeeded but no URL was returned.");
                      }

                      setTimeout(() => {
                        handleClose();
                      }, 800);
                    }
                  }}
                  onUploadError={(error: Error) => {
                    setIsUploading(false);
                    alert(`Upload failed: ${error.message}`);
                  }}
                  className="w-full"
                  appearance={{
                    container:
                      "w-full min-h-[200px] border border-dashed border-white/20 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group",
                    label: "text-gray-300 text-sm font-medium group-hover:text-white transition-colors",
                    allowedContent: "text-gray-500 text-xs mt-1",
                    button:
                      "bg-white text-black font-medium px-5 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors mt-3",
                    uploadIcon: "text-gray-500 w-10 h-10 group-hover:text-gray-400 transition-colors",
                  }}
                />
              )}
            </div>
          )}

          {/* Formula Mode - Only for Scholar users */}
          {currentMode === "formula" && !isFreeTier && (
            <div className="space-y-4">
              {/* Formula Upload Zone */}
              {!extractedLatex && (
                <div
                  {...getRootProps()}
                  className={cn(
                    "relative border border-dashed rounded-xl p-8 text-center transition-all cursor-pointer group",
                    isDragActive
                      ? "border-purple-400 bg-purple-500/10"
                      : imagePreview
                        ? "border-purple-500/40 bg-purple-500/5"
                        : "border-white/20 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.04]"
                  )}
                >
                  <input {...getInputProps()} />

                  {imagePreview ? (
                    <div className="space-y-4">
                      <div className="relative inline-block">
                        <img
                          src={imagePreview}
                          alt="Uploaded formula"
                          className="max-h-32 mx-auto rounded-lg border border-white/10 shadow-lg"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resetFormulaState();
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center transition-colors"
                        >
                          <X className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">Click or drop to replace</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                        <Upload className="w-6 h-6 text-gray-500 group-hover:text-gray-400 transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-300 font-medium">
                          {isDragActive ? "Drop the image here" : "Drop an image with a formula"}
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
              {extractedLatex && (
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Preview</span>
                      {getConfidenceBadge()}
                    </div>
                    <div
                      className="text-center text-white overflow-x-auto py-3 bg-black/30 rounded-lg"
                      dangerouslySetInnerHTML={{ __html: renderLatex(editedLatex) }}
                    />
                    {description && (
                      <p className="text-xs text-gray-400 mt-3 text-center">{description}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">LaTeX Code</label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleCopy} 
                        className="h-7 px-2 text-xs text-gray-400 hover:text-white hover:bg-white/10"
                      >
                        {copied ? <><Check className="w-3 h-3 mr-1.5" />Copied</> : <><Copy className="w-3 h-3 mr-1.5" />Copy</>}
                      </Button>
                    </div>
                    <textarea
                      value={editedLatex}
                      onChange={(e) => setEditedLatex(e.target.value)}
                      className="w-full h-24 p-3 rounded-lg bg-black/40 border border-white/10 text-gray-200 font-mono text-xs resize-none focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-white/20 transition-all"
                      placeholder="LaTeX code will appear here..."
                    />
                  </div>

                  <button 
                    onClick={resetFormulaState} 
                    className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Upload className="w-3 h-3" />
                    Upload different image
                  </button>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-white/5 bg-white/[0.02]">
          <Button 
            variant="ghost" 
            onClick={handleClose} 
            className="text-gray-400 hover:text-white hover:bg-white/10 px-4"
          >
            Cancel
          </Button>

          {currentMode === "formula" && !extractedLatex && !isFreeTier && (
            <Button
              onClick={handleExtract}
              disabled={!imageBase64 || isExtracting}
              className="bg-white text-black hover:bg-gray-100 font-medium px-5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExtracting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Extracting...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Extract Formula</>
              )}
            </Button>
          )}

          {currentMode === "formula" && extractedLatex && !isFreeTier && onFormulaExtracted && (
            <Button 
              onClick={handleInsertFormula} 
              className="bg-white text-black hover:bg-gray-100 font-medium px-5"
            >
              <Check className="w-4 h-4 mr-2" />
              Insert Formula
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
