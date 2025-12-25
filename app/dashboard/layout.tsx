import { Sidebar } from "@/components/dashboard/Sidebar";
import { RightSidebar } from "@/components/dashboard/RightSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-[#050505] to-[#101015] overflow-hidden relative">
      <Sidebar />
      <main className="flex-1 h-full overflow-hidden relative z-0">
        {children}
      </main>
      <RightSidebar />
    </div>
  );
}
