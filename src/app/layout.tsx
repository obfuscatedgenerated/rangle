import type {Metadata} from "next";
import {Encode_Sans, Roboto} from "next/font/google";
import "./globals.css";

import {ViewTransition} from "react";
import {RangleScoresProvider} from "@/context/RangleScoresContext";
import {SettingsProvider} from "@/context/SettingsContext";
import {ThemeApplier} from "@/components/ThemeApplier";
import {ContextProviders} from "@/components/ContextProviders";
import {AuthProvider} from "@/context/AuthContext";
import {CloudSyncProvider} from "@/context/CloudSyncContext";
import {RangleStateProvider} from "@/context/RangleStateContext";

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

// default fonts

// used specifically for Rangle title
const encode = Encode_Sans({
    variable: "--font-encode",
    subsets: ["latin"],
});

// used as default body font
const roboto = Roboto({
    variable: "--font-roboto",
    subsets: ["latin"],
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`${encode.variable} ${roboto.variable} font-main h-full antialiased`}
        >
            <body className="pt-[var(--sait)] pb-[var(--saib)] min-h-full flex flex-col">
                <noscript className="absolute top-1/4 left-1/2 -translate-x-1/2">Please enable JavaScript to play Rangle!</noscript>
                <ContextProviders providers={[
                    RangleScoresProvider,
                    SettingsProvider,
                    AuthProvider,
                    CloudSyncProvider,
                    RangleStateProvider,
                ]}>
                    <ThemeApplier />

                    <ViewTransition name="zoom-and-fade">
                        {children}
                    </ViewTransition>
                </ContextProviders>
            </body>
        </html>
    );
}
