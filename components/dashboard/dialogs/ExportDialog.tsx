"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDown, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: Id<"notes">;
  noteTitle: string;
}

type PageFormat = "A4" | "Letter" | "Legal";

export function ExportDialog({
  open,
  onOpenChange,
  noteId,
  noteTitle,
}: ExportDialogProps) {
  const [format, setFormat] = useState<PageFormat>("A4");
  const [isExporting, setIsExporting] = useState(false);

  const generatePdf = useAction(api.export.generateAndStorePdf);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const result = await generatePdf({
        noteId,
        options: {
          format,
          printBackground: true,
        },
      });

      if (result?.url) {
        // Open PDF in new tab
        window.open(result.url, "_blank");
        toast.success("PDF exported successfully!", {
          description: "Your PDF has been generated and opened in a new tab.",
        });
        onOpenChange(false);
      } else {
        throw new Error("No PDF URL returned");
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate PDF. Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-[#0A0A0A] border-white/10 text-white shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <FileDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle>Export to PDF</DialogTitle>
              <DialogDescription className="text-gray-400">
                Generate a PDF of &quot;{noteTitle}&quot;
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Page Format */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="format" className="text-right text-gray-400">
              Page Size
            </Label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as PageFormat)}
            >
              <SelectTrigger className="col-span-3 bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="A4" className="text-white hover:bg-white/5">
                  A4 (210 × 297 mm)
                </SelectItem>
                <SelectItem
                  value="Letter"
                  className="text-white hover:bg-white/5"
                >
                  Letter (8.5 × 11 in)
                </SelectItem>
                <SelectItem
                  value="Legal"
                  className="text-white hover:bg-white/5"
                >
                  Legal (8.5 × 14 in)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500 bg-white/5 rounded-lg p-3 mt-2">
            <p>
              The PDF will be generated server-side for the best quality. This
              may take a few seconds.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
            className="text-gray-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                Export PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
