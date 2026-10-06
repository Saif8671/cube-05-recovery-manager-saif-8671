import "./globals.css";
import { Inter } from "next/font/google";
import { WorkspaceProvider } from "../context/WorkspaceContext";
import AppShell from "../components/AppShell";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "Recovery Manager — Evidence-First Recovery Ops",
  description: "Internal operations console for marketplace fee dispute recovery. Evidence first, claim second.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`scroll-smooth ${inter.variable}`}>
      <body className={`${inter.className} bg-white text-gray-900 min-h-screen antialiased`}>
        <WorkspaceProvider>
          <AppShell>
            {children}
          </AppShell>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
