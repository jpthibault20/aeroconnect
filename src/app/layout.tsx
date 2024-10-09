import type { Metadata } from "next";
import "./globals.css";



export const metadata: Metadata = {
  title: "aeroconnect",
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
      </body>
    </html>
  );
}
