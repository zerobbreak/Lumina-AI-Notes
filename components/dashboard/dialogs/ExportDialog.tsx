"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Download,
  Printer,
  Zap,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { usePDF, ExportMethod } from "@/hooks/usePDF";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elementId: string;
  filename: string;
  title?: string;
}

const exportMethods: {
  value: ExportMethod;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "auto",
    label: "Auto (Recommended)",
    description: "Automatically chooses the best method based on your content",
    icon: <Zap className="w-4 h-4" />,
  },
  {
    value: "print",
    label: "Print Dialog",
    description:
      "Opens browser print dialog. Most reliable for complex content",
    icon: <Printer className="w-4 h-4" />,
  },
  {
    value: "jspdf",
    label: "Direct Download",
    description: "Downloads PDF directly. Fastest for text-heavy notes",
    icon: <Download className="w-4 h-4" />,
  },
];

export function ExportDialog({
  open,
  onOpenChange,
  elementId,
  filename,
  title,
}: ExportDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<ExportMethod>("auto");
  const [status, setStatus] = useState<
    "idle" | "exporting" | "success" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const { exportPDF, progress } = usePDF();

  const handleExport = async () => {
    setStatus("exporting");
    setError(null);

    try {
      await exportPDF(elementId, filename, {
        method: selectedMethod,
        title,
        onProgress: () => {}, // Progress is tracked via hook state
      });
      setStatus("success");

      // Close dialog after short delay on success
      setTimeout(() => {
        onOpenChange(false);
        setStatus("idle");
      }, 1500);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleClose = () => {
    if (status !== "exporting") {
      onOpenChange(false);
      setStatus("idle");
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[#111] border border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-cyan-400" />
            Export as PDF
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose how you want to export your note
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Method Selection */}
          <div className="space-y-3">
            <Label className="text-gray-300">Export Method</Label>
            <div className="space-y-2">
              {exportMethods.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setSelectedMethod(method.value)}
                  disabled={status === "exporting"}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${
                    selectedMethod === method.value
                      ? "border-cyan-500/50 bg-cyan-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  } ${status === "exporting" ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      selectedMethod === method.value
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "bg-white/10 text-gray-400"
                    }`}
                  >
                    {method.icon}
                  </div>
                  <div className="flex-1">
                    <div
                      className={`font-medium ${
                        selectedMethod === method.value
                          ? "text-cyan-400"
                          : "text-gray-200"
                      }`}
                    >
                      {method.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {method.description}
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedMethod === method.value
                        ? "border-cyan-500 bg-cyan-500"
                        : "border-gray-600"
                    }`}
                  >
                    {selectedMethod === method.value && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          {status === "exporting" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Exporting...</span>
                <span className="text-cyan-400">{progress}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success State */}
          {status === "success" && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400">Export complete!</span>
            </div>
          )}

          {/* Error State */}
          {status === "error" && error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-red-400 font-medium">Export failed</div>
                <div className="text-red-400/70 text-sm mt-1">{error}</div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={status === "exporting"}
            className="text-gray-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={status === "exporting" || status === "success"}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            {status === "exporting" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : status === "error" ? (
              "Retry"
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
