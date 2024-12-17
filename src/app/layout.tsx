import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster"
import "./globals.css";



export const metadata: Metadata = {
  title: "AeroConnect",
  description: "planning for flying clubs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
