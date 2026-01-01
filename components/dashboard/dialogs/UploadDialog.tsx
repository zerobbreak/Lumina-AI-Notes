"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileType,
  Check,
  X,
  FileText,
  Image as ImageIcon,
} from "lucide-react";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId?: string;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function UploadDialog({
  open,
  onOpenChange,
  courseId,
}: UploadDialogProps) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const uploadFile = useMutation(api.files.uploadFile);

  const [name, setName] = useState("");
  const [type, setType] = useState("pdf");
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // NOTE: Helper to reset everything on close
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setName("");
      setType("pdf");
      setUrl("");
      setSelectedFile(null);
    }, 300);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      // Auto-fill name if empty
      if (!name) {
        setName(e.target.files[0].name);
      }
    }
  };

  const handleUpload = async () => {
    if (!name) return;
    if (type === "link" && !url) return;
    if (type !== "link" && !selectedFile) return;

    setIsUploading(true);
    const promise = async () => {
      let storageId: string | undefined;

      if (type !== "link" && selectedFile) {
        // 1. Get short-lived upload URL
        const postUrl = await generateUploadUrl();

        // 2. POST the file to the URL
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });

        if (!result.ok) throw new Error("Upload failed");

        const { storageId: id } = await result.json();
        storageId = id;
      }

      // 3. Save metadata to Convex
      await uploadFile({
        name,
        type,
        url: type === "link" ? url : undefined,
        storageId,
        courseId,
      });

      handleClose();
    };

    setIsUploading(true);
    toast.promise(promise(), {
      loading: "Uploading resource...",
      success: "Resource moved to library",
      error: "Failed to upload resource",
    });
    setIsUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-[#0A0A0A] border-white/10 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle>Upload Resource</DialogTitle>
          <DialogDescription className="text-gray-400">
            Add a file to your resource library. Supported formats: PDF, Images,
            or Links.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-gray-400">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/5 border-white/10 text-white focus:border-indigo-500 transition-colors w-full"
              placeholder={
                type === "link" ? "My Awesome Link" : "Lecture Slides.pdf"
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type" className="text-gray-400">
              Type
            </Label>
            <Select
              value={type}
              onValueChange={(val) => {
                setType(val);
                setSelectedFile(null);
              }}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-white w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                <SelectItem value="pdf">PDF Document</SelectItem>
                <SelectItem value="img">Image</SelectItem>
                <SelectItem value="link">Link / URL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "link" ? (
            <div className="grid gap-2">
              <Label htmlFor="url" className="text-gray-400">
                URL
              </Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-white/5 border-white/10 text-white focus:border-indigo-500 w-full"
                placeholder="https://example.com"
              />
            </div>
          ) : (
            <div className="min-w-0">
              {selectedFile ? (
                <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg group hover:border-white/20 transition-colors w-full max-w-full overflow-hidden">
                  <div className="h-10 w-10 bg-indigo-500/10 rounded-lg flex items-center justify-center shrink-0">
                    {type === "img" ? (
                      <ImageIcon className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-indigo-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="h-32 border-2 border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center gap-3 text-gray-500 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer relative overflow-hidden group">
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    accept={type === "img" ? "image/*" : ".pdf"}
                    onChange={handleFileSelect}
                  />
                  <div className="p-3 bg-white/5 rounded-full group-hover:bg-indigo-500/10 transition-colors">
                    <Upload className="w-6 h-6 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                      Click to upload
                    </p>
                    <p className="text-xs text-gray-500">
                      {type === "img"
                        ? "SVG, PNG, JPG or GIF"
                        : "PDF Documents only"}
                    </p>
                  </div>
                </div>
              )}
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
          <Button
            onClick={handleUpload}
            disabled={
              isUploading ||
              !name ||
              (type === "link" && !url) ||
              (type !== "link" && !selectedFile)
            }
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {isUploading
              ? "Uploading..."
              : type === "link"
                ? "Add Link"
                : "Upload File"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
