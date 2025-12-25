"use client";

import {
  Search,
  Settings,
  Library,
  BookOpen,
  GraduationCap,
  FileText,
  ChevronRight,
  Command,
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function Sidebar() {
  const { user } = useUser();

  return (
    <div className="w-[260px] h-screen bg-black/20 backdrop-blur-xl border-r border-white/5 flex flex-col flex-shrink-0 z-50 relative">
      {/* Workspace Switcher & Search */}
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3 px-2 py-1 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
            U
          </div>
          <div className="flex-1 overflow-hidden">
            <h2 className="font-semibold text-white text-sm truncate">
              University of Tech
            </h2>
            <p className="text-[10px] text-gray-500 truncate group-hover:text-gray-400">
              Pro Plan
            </p>
          </div>
          <Settings className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
        </div>

        <Button
          variant="outline"
          className="w-full justify-between bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 h-9"
        >
          <span className="flex items-center gap-2 text-xs">
            <Search className="w-3.5 h-3.5" />
            Universal Search
          </span>
          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded border border-white/5">
            ⌘K
          </span>
        </Button>
      </div>

      {/* Smart Folders */}
      <div className="flex-1 px-3 py-2">
        <div className="flex items-center justify-between px-2 mb-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Smart Folders
          </h3>
          <Library className="w-3.5 h-3.5 text-gray-600" />
        </div>

        <div className="space-y-0.5">
          {[
            {
              name: "CS 101 - Intro to Algo",
              icon: GraduationCap,
              active: true,
              hasRecording: true,
            },
            {
              name: "BIO 102 - Genetics",
              icon: BookOpen,
              active: false,
              hasRecording: false,
            },
            {
              name: "ECON 201 - Micro",
              icon: Library,
              active: false,
              hasRecording: true,
            },
          ].map((folder) => (
            <Button
              key={folder.name}
              variant="ghost"
              className={`w-full justify-between h-9 px-2 text-sm font-medium ${folder.active ? "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <folder.icon
                  className={`w-4 h-4 ${folder.active ? "text-indigo-400" : "text-gray-500"}`}
                />
                <span className="truncate">{folder.name}</span>
              </div>
              {folder.hasRecording && (
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
              )}
            </Button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between px-2 mb-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Recent Notes
          </h3>
        </div>
        <div className="space-y-0.5">
          <Button
            variant="ghost"
            className="w-full justify-start h-8 px-2 text-xs text-gray-400 hover:text-white hover:bg-white/5 gap-2.5"
          >
            <FileText className="w-3.5 h-3.5" />
            Algorithmic Complexity
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start h-8 px-2 text-xs text-gray-400 hover:text-white hover:bg-white/5 gap-2.5"
          >
            <FileText className="w-3.5 h-3.5" />
            Market Equilibrium
          </Button>
        </div>
      </div>

      {/* Footer / Knowledge Base */}
      <div className="p-4 border-t border-white/5 bg-black/40">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-gray-500">
              Knowledge Base
            </span>
            <span className="text-[10px] text-gray-400">12/50 PDFs</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full w-[24%] bg-indigo-500 rounded-full" />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <UserButton
            appearance={{ elements: { avatarBox: "w-8 h-8 rounded-lg" } }}
          />
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">
              {user?.fullName}
            </p>
            <p className="text-xs text-gray-500 truncate">Student</p>
          </div>
        </div>
      </div>
    </div>
  );
}
