"use client";

import { Sidebar } from "@/components/dashboard/sidebar/Sidebar";
import { RightSidebar } from "@/components/dashboard/sidebar/RightSidebar";
import { DashboardProvider } from "@/components/dashboard/DashboardContext";
import { DocumentProcessingIndicator } from "@/components/documents";
import { DragOverlayWrapper } from "@/components/dashboard/DragOverlayWrapper";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
  );
}
