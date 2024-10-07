"use client"
import { ExempleWrapper } from "../context/useExemple";

export default function ProtectLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div>
            <ExempleWrapper>
                {children}
            </ExempleWrapper>
        </div>
    );
}
