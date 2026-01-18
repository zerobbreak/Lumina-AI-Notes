"use client";

import * as React from "react";
import {
  Search,
  FileText,
  File,
  Layers,
  CornerDownLeft,
  Crown,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import Link from "next/link";

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [filterType, setFilterType] = React.useState<"all" | "note" | "file" | "deck">("all");
  const debouncedQuery = useDebounce(query, 300);

  // Conditionally fetch results only when query exists
  const searchResponse = useQuery(
    api.search.search,
    debouncedQuery.trim()
      ? { query: debouncedQuery, type: filterType }
      : "skip"
  );

  const results = searchResponse?.results;
  const tier = searchResponse?.tier || "free";
  const limitReached = searchResponse?.limitReached || false;
  const isFreeTier = tier === "free";

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setFilterType("all");
    }
  }, [open]);

  const handleSelect = (url: string) => {
    router.push(url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-[550px] bg-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden rounded-xl">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center px-4 py-3 border-b border-white/5 gap-2">
          <Search className="w-5 h-5 text-gray-500 shrink-0" />
          <input
            className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-gray-600 text-[15px] h-6"
            placeholder="Search notes, files, or flashcards..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <Select value={filterType} onValueChange={(value) => setFilterType(value as typeof filterType)}>
            <SelectTrigger className="h-8 w-24 border-white/10 bg-white/5 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0a] border-white/10">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="note">Notes</SelectItem>
              <SelectItem value="file">Files</SelectItem>
              <SelectItem value="deck">Decks</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-[10px] bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-gray-500 font-mono shrink-0">
            ESC
          </div>
        </div>

        <div className="max-h-[350px] overflow-y-auto p-2">
          {!query && (
            <div className="text-center py-10 text-gray-600 text-sm">
              Type to start searching...
            </div>
          )}

          {debouncedQuery && !searchResponse && (
            <div className="text-center py-10 text-gray-600 text-sm animate-pulse">
              Searching...
            </div>
          )}

          {results && results.length === 0 && (
            <div className="text-center py-10 text-gray-600 text-sm">
              No results found.
            </div>
          )}

          {results && results.length > 0 && (
            <div className="space-y-1">
              {results.map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleSelect(result.url)}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg cursor-pointer group transition-colors"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      result.type === "note" &&
                        "bg-amber-500/10 text-amber-500",
                      result.type === "file" && "bg-blue-500/10 text-blue-500",
                      result.type === "deck" &&
                        "bg-indigo-500/10 text-indigo-500"
                    )}
                  >
                    {result.type === "note" && <FileText className="w-4 h-4" />}
                    {result.type === "file" && <File className="w-4 h-4" />}
                    {result.type === "deck" && <Layers className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-medium text-gray-200 group-hover:text-white truncate">
                      {result.title}
                    </h4>
                    <p className="text-[11px] text-gray-500 truncate">
                      {result.subtitle}
                    </p>
                  </div>
                  <CornerDownLeft className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}

              {/* Upgrade prompt when limit reached */}
              {limitReached && isFreeTier && (
                <div className="mt-3 p-3 bg-linear-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-300">
                        More results available with Scholar
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Upgrade for unlimited search across all your notes
                      </p>
                    </div>
                    <Link
                      href="/#pricing"
                      onClick={() => onOpenChange(false)}
                      className="shrink-0 flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors"
                    >
                      <Crown className="w-3 h-3" />
                      Upgrade
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/5 bg-white/2 flex items-center justify-between text-[10px] text-gray-600">
          <span>Navigate with arrows</span>
          <span>Press Enter to select</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
