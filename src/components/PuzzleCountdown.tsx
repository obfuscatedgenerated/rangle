"use client";

import Countdown from "react-countdown";

interface RendererProps {
    hours: number;
    minutes: number;
    seconds: number;
    completed: boolean;
}

export const PuzzleCountdown = () => {
    const now = new Date();

    const next_midnight = new Date(
        Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + 1,
            0, 0, 0, 0
        )
    );

    const renderer = ({ hours, minutes, seconds, completed }: RendererProps) => {
        if (completed) {
            return (
                // TODO: Link is better but need to handle state properly
                <a
                    className="text-2xl font-bold tracking-widest bg-green-600 px-3 py-1 rounded text-white cursor-pointer font-sans"
                    href="/"
                >
                    Play now!
                </a>
            )
        } else {
            const h = String(hours).padStart(2, "0");
            const m = String(minutes).padStart(2, "0");
            const s = String(seconds).padStart(2, "0");
            return <span className="text-2xl font-mono font-bold tracking-widest">{h}:{m}:{s}</span>;
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Next Rangle in</p>
            <Countdown
                date={next_midnight}
                renderer={renderer}
                daysInHours={true}
            />
        </div>
    );
}
