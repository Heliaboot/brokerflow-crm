import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { PURGE_STALE_STORAGE_SCRIPT } from "@/lib/storage-config";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BrokerFlow CRM",
  description: "BrokerFlow CRM — real estate brokerage CRM prototype",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-zinc-50 antialiased`}>
        {/* Purge stale localStorage before React hydrates. Key + version come from lib/storage-config.ts (shared with lib/store.tsx). */}
        <script dangerouslySetInnerHTML={{ __html: PURGE_STALE_STORAGE_SCRIPT }} />
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <TopNav />
              <main className="flex-1 px-4 md:px-6 py-6">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
