"use client";

import { useState, useCallback } from "react";
import { useAiActions } from "@/lib/hooks/ai/useAiActions";
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

  const resetFormulaState = () => {
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

    try {
      const result = await extractFormula({ imageBase64, mimeType });

      if (result.success && result.latex) {
        setExtractedLatex(result.latex);
        setEditedLatex(result.latex);
        setDescription(result.description || null);
        setConfidence(result.confidence || null);
      } else {
        setError(result.error || "Failed to extract formula");
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

  // TEMPORARY: All features are free - show all tabs
  const showTabs = true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] bg-background border-border text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg", mode === "upload" ? "bg-primary/20" : "bg-primary/20")}>
              {mode === "upload" ? (
                <ImageIcon className="w-5 h-5 text-primary" />
              ) : (
                <Sparkles className="w-5 h-5 text-primary" />
              )}
            </div>
            {mode === "upload" ? "Upload Image" : "Extract Formula"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {mode === "upload"
              ? "Add an image to your note. Supports PNG, JPG, GIF up to 4MB."
              : "Upload an image containing a formula. AI will convert it to LaTeX."}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Tabs - Only show for Scholar users */}
        {showTabs && (
          <div className="flex gap-2 p-1 bg-foreground/5 rounded-lg">
            <button
              onClick={() => {
                setMode("upload");
                resetFormulaState();
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                mode === "upload"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              )}
            >
              <ImageIcon className="w-4 h-4" />
              Insert Image
            </button>
            <button
              onClick={() => {
                setMode("formula");
                setUploadSuccess(false);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                mode === "formula"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              )}
            >
              <Sparkles className="w-4 h-4" />
              Extract Formula
            </button>
          </div>
        )}

        {/* Upload Mode */}
        {mode === "upload" && (
          <div className="py-4">
            {uploadSuccess ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <div className="p-4 bg-emerald-500/20 rounded-full">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </div>
                <p className="text-emerald-400 font-medium">
                  Image uploaded successfully!
                </p>
              </div>
            ) : isUploading ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-muted-foreground">Uploading your image...</p>
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
                    "w-full h-52 border-2 border-dashed border-border rounded-xl bg-foreground/5 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer ut-uploading:border-primary/30 flex flex-col items-center justify-center gap-4",
                  label: "text-foreground/80 hover:text-foreground transition-colors font-medium",
                  allowedContent: "text-muted-foreground/80 text-xs",
                  button:
                    "bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 py-2 rounded-md transition-colors ut-uploading:bg-primary ut-uploading:cursor-not-allowed",
                  uploadIcon: "text-primary w-12 h-12 mb-2",
                }}
              />
            )}
          </div>
        )}

        {/* Formula Mode */}
        {mode === "formula" && (
          <div className="space-y-4 py-4">
            {/* Formula Upload Zone */}
            {!extractedLatex && (
              <div
                {...getRootProps()}
                className={cn(
                  "relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
                  isDragActive
                    ? "border-primary bg-primary/10"
                    : imagePreview
                      ? "border-primary/30 bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-primary/5"
                )}
              >
                <input {...getInputProps()} />

                {imagePreview ? (
                  <div className="space-y-3">
                    <img
                      src={imagePreview}
                      alt="Uploaded formula"
                      className="max-h-36 mx-auto rounded-lg border border-border"
                    />
                    <p className="text-xs text-muted-foreground">Click or drop to replace</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-foreground/5 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-muted-foreground/80" />
                    </div>
                    <p className="text-sm text-foreground/80">
                      {isDragActive ? "Drop the image here" : "Drop an image with a formula"}
                    </p>
                    <p className="text-xs text-muted-foreground/80">
                      PNG, JPG, GIF, WebP up to 10MB
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Extracted Formula Display */}
            {extractedLatex && (
              <div className="space-y-3">
                <div className="bg-foreground/5 rounded-xl p-4 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground/80 uppercase tracking-wider">Result</span>
                    {getConfidenceBadge()}
                  </div>
                  <div
                    className="text-center text-foreground overflow-x-auto py-2"
                    dangerouslySetInnerHTML={{ __html: renderLatex(editedLatex) }}
                  />
                  {description && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">{description}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground/80">LaTeX (editable)</label>
                    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 text-xs text-muted-foreground">
                      {copied ? <><Check className="w-3 h-3 mr-1" />Copied</> : <><Copy className="w-3 h-3 mr-1" />Copy</>}
                    </Button>
                  </div>
                  <textarea
                    value={editedLatex}
                    onChange={(e) => setEditedLatex(e.target.value)}
                    className="w-full h-20 p-2 rounded-lg bg-inset border border-border text-foreground/90 font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <button onClick={resetFormulaState} className="text-xs text-primary hover:text-primary/80">
                  Try another image
                </button>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            Cancel
          </Button>

          {mode === "formula" && !extractedLatex && (
            <Button
              onClick={handleExtract}
              disabled={!imageBase64 || isExtracting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isExtracting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Extracting...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Extract</>
              )}
            </Button>
          )}

          {mode === "formula" && extractedLatex && onFormulaExtracted && (
            <Button onClick={handleInsertFormula} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Insert Formula
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
