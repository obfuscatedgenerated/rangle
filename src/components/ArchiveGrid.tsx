"use client";

import EPOCH from "../../epoch";

import {useMemo} from "react";
import Link from "next/link";

import {SaveStateDay} from "@/hooks/useRangleState";

interface ArchiveTileProps {
    date_str: string;
    index: number;
    total: number;
    save_data?: SaveStateDay;
}

const ArchiveTile = ({
    date_str,
    index,
    total,
    save_data
}: ArchiveTileProps) => {
    return (
        <Link href={`/?d=${date_str}`} className="text-blue-500 hover:underline">
            [{index === 0 ? "Today" : (total - index)}] {date_str} {save_data ? `- ${save_data.attempts.length} attempts` : "- No save data"}
        </Link>
    );
}

export const ArchiveGrid = () => {
    const iso_dates = useMemo(
        () => {
            // for every day going backwards until the epoch, add a link to the puzzle
            const today = new Date();
            const iso_dates = [];
            for (let date = today; date >= EPOCH; date.setUTCDate(date.getUTCDate() - 1)) {
                iso_dates.push(date.toISOString().split("T")[0]);
            }

            return iso_dates;
        },
        []
    );

    const save_state = useMemo(
        () => {
            if (typeof window === "undefined") {
                return null;
            }

            const saved_state = localStorage.getItem("rangle_state_v1");
            if (!saved_state) {
                return null;
            }

            try {
                return JSON.parse(saved_state);
            } catch (e) {
                console.warn("Failed to parse saved state from localStorage, ignoring:", e);
                return null;
            }
        },
        []
    );

    return (
        <>
            {iso_dates.map((date_str, index) => (
                <ArchiveTile
                    key={date_str}
                    date_str={date_str}
                    index={index}
                    total={iso_dates.length}
                    save_data={save_state ? save_state[date_str] : undefined}
                />
            ))}
        </>
    );
}
