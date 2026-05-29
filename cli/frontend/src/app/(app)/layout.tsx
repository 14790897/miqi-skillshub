import Sidebar from "../../components/layout/sidebar";
import Header from "../../components/layout/header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 overflow-hidden h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-auto bg-[var(--color-bg-canvas)]">
          {children}
        </main>
      </div>
    </div>
  );
}
