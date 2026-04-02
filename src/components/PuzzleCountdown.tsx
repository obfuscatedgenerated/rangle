"use client";

import {time_zone} from "../../time";

import {useMemo, useCallback} from "react";
import Countdown from "react-countdown";

interface RendererProps {
    hours: number;
    minutes: number;
    seconds: number;
    completed: boolean;
}

export const PuzzleCountdown = () => {
    const next_midnight = useMemo(() => {
        const now = new Date();

        // formatted to the target timezone but as a string, so decoupled from timezone but still represents the current time in that timezone
        const tz_time_str = now.toLocaleString("en-US", { timeZone: time_zone });

        // parse back as a local date, which effectively gives us the current time in the target timezone as a Date object
        const tz_time_mock = new Date(tz_time_str);

        const tz_midnight_mock = new Date(
            tz_time_mock.getFullYear(),
            tz_time_mock.getMonth(),
            tz_time_mock.getDate() + 1,
            0, 0, 0, 0
        );

        // find the difference in milliseconds between the current time in the target timezone and the next midnight in the target timezone
        const ms_until_midnight = tz_midnight_mock.getTime() - tz_time_mock.getTime();

        // add that difference to the current time to get the actual next midnight time in the target timezone
        return new Date(now.getTime() + ms_until_midnight);
    }, []);

    const renderer = useCallback(
        ({ hours, minutes, seconds, completed }: RendererProps) => {
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
        },
        []
    );

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
