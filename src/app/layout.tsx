import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UPC Anomaly Visualizer | Generative p5.js Barcode Artwork",
  description: "Scan barcodes and reveal hidden visual and sonic anomalies flowing through the space between UPC codes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-black text-zinc-100 antialiased overflow-hidden select-none font-sans">
        {children}
      </body>
    </html>
  );
}
