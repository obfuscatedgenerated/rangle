import type {Metadata} from "next";
import {Encode_Sans, Roboto} from "next/font/google";
import "./globals.css";

// used specifically for Rangle title
const title = Encode_Sans({
    variable: "--font-title",
    subsets: ["latin"],
});

// used as default body font
const sans = Roboto({
    variable: "--font-sans",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Rangle",
    description: "Rangle is a game about sorting.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`${title.variable} ${sans.variable} font-sans h-full antialiased`}
        >
        <body className="min-h-full flex flex-col">{children}</body>
        </html>
    );
}
