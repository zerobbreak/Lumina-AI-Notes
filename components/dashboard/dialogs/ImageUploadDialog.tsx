"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UploadDropzone } from "@/lib/uploadthing";
import { Loader2, ImageIcon, CheckCircle } from "lucide-react";

interface ImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageUploaded: (url: string) => void;
}

export function ImageUploadDialog({
  open,
  onOpenChange,
  onImageUploaded,
}: ImageUploadDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after animation
    setTimeout(() => {
      setUploadSuccess(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#0A0A0A] border-white/10 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <ImageIcon className="w-5 h-5 text-indigo-400" />
            </div>
            Upload Image
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Add an image to your note. Supports PNG, JPG, GIF up to 4MB.
          </DialogDescription>
        </DialogHeader>

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
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              <p className="text-gray-400">Uploading your image...</p>
            </div>
          ) : (
            <UploadDropzone
              endpoint="imageUploader"
              onUploadBegin={() => setIsUploading(true)}
              onClientUploadComplete={(res) => {
                setIsUploading(false);
                setUploadSuccess(true);

                if (res && res[0]) {
                  // Get the URL from the response - try multiple property names
                  const file = res[0];
                  const url = file.ufsUrl || file.url || file.appUrl;

                  if (url) {
                    onImageUploaded(url);
                  } else {
                    alert("Upload succeeded but no URL was returned.");
                  }

                  // Close dialog after brief success animation
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
                  "w-full h-64 border-2 border-dashed border-white/10 rounded-xl bg-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer ut-uploading:border-indigo-500/30 flex flex-col items-center justify-center gap-4",
                label:
                  "text-gray-300 hover:text-white transition-colors font-medium",
                allowedContent: "text-gray-500 text-xs",
                button:
                  "bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-md transition-colors ut-uploading:bg-indigo-700 ut-uploading:cursor-not-allowed",
                uploadIcon: "text-indigo-400 w-12 h-12 mb-2",
              }}
            />
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
