import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Physics Calculator",
  description: "Advanced Physics Calculator with 21 chapters and 205 formulas — solve for any variable",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
