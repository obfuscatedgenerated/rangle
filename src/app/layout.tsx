import type {Metadata} from "next";
import {Encode_Sans, Roboto} from "next/font/google";
import "./globals.css";

import {ViewTransition} from "react";
import {RangleScoresProvider} from "@/context/RangleScoresContext";

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
    title: {
        default: "Rangle",
        template: "%s | Rangle"
    },
    description: "Rangle is a game about sorting.",
    icons: "/icon.svg",
    metadataBase: "https://rangle.today",
    openGraph: {
        images: [
            // {
            //     url: "/icon@1x.png",
            //     width: 64,
            //     height: 64,
            // },
            // {
            //     url: "/icon@2x.png",
            //     width: 128,
            //     height: 128,
            // },
            // {
            //     url: "/icon@3x.png",
            //     width: 192,
            //     height: 192,
            // },
            // {
            //     url: "/icon@4x.png",
            //     width: 256,
            //     height: 256,
            // },
            // {
            //     url: "/icon@8x.png",
            //     width: 512,
            //     height: 512,
            // },
            {
                url: "/icon@16x.png",
                width: 1024,
                height: 1024,
            },
            // {
            //     url: "/icon@32x.png",
            //     width: 2048,
            //     height: 2048,
            // }
        ]
    },
    twitter: {
        card: "summary",
    }
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
            <body className="min-h-full flex flex-col">
                <noscript className="absolute top-1/4 left-1/2 -translate-x-1/2">Please enable JavaScript to play Rangle!</noscript>
                <ViewTransition name="zoom-and-fade">
                    <RangleScoresProvider>
                        {children}
                    </RangleScoresProvider>
                </ViewTransition>
            </body>
        </html>
    );
}
