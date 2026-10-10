import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://ai-perks-two.vercel.app"),
  title: "AI Perks — Your business, in sync",
  description:
    "A modern business workspace for conversations, customers, orders and intelligent assistance.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
