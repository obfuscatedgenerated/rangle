"use client";

interface SearchSpotlightsProps {
    active: boolean;
}

export const SearchSpotlights = ({active}: SearchSpotlightsProps) => (
    <div
        className={`fixed inset-0 z-[100] pointer-events-none overflow-hidden bg-black/40 backdrop-blur-sm transition-opacity duration-1000 ${active ? "opacity-100" : "opacity-0"}`}>
        <div
            className="absolute top-[-10%] left-[15%] w-[70vw] h-[150vh] origin-top animate-spotlight-search-left"
            style={{
                background: "conic-gradient(from 165deg at top center, rgba(255,255,255,0.3) 0deg, transparent 20deg)",
                filter: "blur(20px)",
            }}
        />

        <div
            className="absolute top-[-10%] right-[15%] w-[70vw] h-[150vh] origin-top animate-spotlight-search-right"
            style={{
                background: "conic-gradient(from 195deg at top center, rgba(255,255,255,0.3) 0deg, transparent 20deg)",
                filter: "blur(20px)",
                animationDelay: "-1.5s"
            }}
        />
    </div>
);
