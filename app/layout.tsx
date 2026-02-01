import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Padel Memory",
  description: "Padel Memory Game",
  icons: {
    icon: "/apple-touch-icon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
