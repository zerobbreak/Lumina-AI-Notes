"use client";

import { Suspense } from "react";
import { Sidebar } from "@/components/dashboard/sidebar/Sidebar";
import { RightSidebar } from "@/components/dashboard/sidebar/RightSidebar";
import { DashboardProvider } from "@/components/dashboard/DashboardContext";
import { DocumentProcessingIndicator } from "@/components/documents";
import { DragOverlayWrapper } from "@/components/dashboard/DragOverlayWrapper";
import { Sparkles } from "lucide-react";

function DashboardLayoutLoading() {
  return (
    <div className="h-screen w-full bg-linear-to-br from-[#050505] to-[#101015] flex items-center justify-center text-gray-500">
      <div className="flex items-center gap-2 animate-pulse">
        <Sparkles className="w-5 h-5" />
        <span>Loading Workspace...</span>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardLayoutLoading />}>
      <DashboardProvider>
        <DragOverlayWrapper>
          <div className="flex h-screen w-full bg-linear-to-br from-[#050505] to-[#101015] overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 h-full overflow-hidden relative z-0">
              {children}
            </main>
            <RightSidebar />

            {/* Document Processing Indicator - shows when PDFs are being processed */}
            <DocumentProcessingIndicator />
          </div>
        </DragOverlayWrapper>
      </DashboardProvider>
    </Suspense>
  );
}
