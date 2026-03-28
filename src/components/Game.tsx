"use client";

import {useState, useEffect} from "react";

interface TodayData {
    date: string;
    number: number;
    difficulty: string;
    neighbourhood: string;
    puzzle: PuzzleStat[];
}

interface PuzzleStat {
    id: string;
    name: string;
    value: number;
    metric: string;
    description: string;
    prefix: string;
    suffix: string;
}

export const Game = () => {
    const [today_data, setTodayData] = useState<TodayData | null>(null);

    useEffect(() => {
        fetch("/daily/today.json", {
            cache: "no-store",
        }).then((res) => res.json()).then((data) => {
            setTodayData(data);
        }).catch((err) => {
            console.error("Error fetching today's data:", err);
        });
    }, []);

    if (!today_data) {
        return (
            <div className="flex flex-col items-center justify-center gap-4">
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <p>#{today_data.number} | {today_data.difficulty}</p>
        </div>
    );
}
