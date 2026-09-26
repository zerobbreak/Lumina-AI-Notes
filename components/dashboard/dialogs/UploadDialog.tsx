"use client";

import { useState } from "react";
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
  X,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { useUploadFileFlow } from "@/lib/hooks/uploads/useUploadFileFlow";
import { formatBytes } from "@/lib/utils";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId?: string;
}

export function UploadDialog({
  open,
  onOpenChange,
  courseId,
}: UploadDialogProps) {
  const uploadFileFlow = useUploadFileFlow();

  const [name, setName] = useState("");
  const [type, setType] = useState("pdf");
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
      await uploadFileFlow({
        name,
        type,
        url: type === "link" ? url : undefined,
        file: type !== "link" ? selectedFile ?? undefined : undefined,
        courseId,
      });
      handleClose();
    };

    toast.promise(promise(), {
      loading: "Uploading resource...",
      success: "Resource moved to library",
      error: "Failed to upload resource",
    });
    setIsUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background border-border text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle>Upload Resource</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add a file to your resource library. Supported formats: PDF, Images,
            or Links.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-muted-foreground">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-foreground/5 border-border text-foreground focus:border-primary transition-colors w-full"
              placeholder={
                type === "link" ? "My Awesome Link" : "Lecture Slides.pdf"
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type" className="text-muted-foreground">
              Type
            </Label>
            <Select
              value={type}
              onValueChange={(val) => {
                setType(val);
                setSelectedFile(null);
              }}
            >
              <SelectTrigger className="bg-foreground/5 border-border text-foreground w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                <SelectItem value="pdf">PDF Document</SelectItem>
                <SelectItem value="img">Image</SelectItem>
                <SelectItem value="link">Link / URL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "link" ? (
            <div className="grid gap-2">
              <Label htmlFor="url" className="text-muted-foreground">
                URL
              </Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-foreground/5 border-border text-foreground focus:border-primary w-full"
                placeholder="https://example.com"
              />
            </div>
          ) : (
            <div className="min-w-0">
              {selectedFile ? (
                <div className="flex items-center gap-3 p-3 bg-foreground/5 border border-border rounded-lg group hover:border-foreground/20 transition-colors w-full max-w-full overflow-hidden">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    {type === "img" ? (
                      <ImageIcon className="w-5 h-5 text-primary" />
                    ) : (
                      <FileText className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground/80">
                      {formatBytes(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-3 text-muted-foreground/80 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer relative overflow-hidden group">
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    accept={type === "img" ? "image/*" : ".pdf"}
                    onChange={handleFileSelect}
                  />
                  <div className="p-3 bg-foreground/5 rounded-full group-hover:bg-primary/10 transition-colors">
                    <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                      Click to upload
                    </p>
                    <p className="text-xs text-muted-foreground/80">
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
            className="text-muted-foreground hover:text-foreground"
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
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
