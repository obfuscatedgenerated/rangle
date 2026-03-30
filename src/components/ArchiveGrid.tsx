"use client";

import EPOCH from "../../epoch";

import {useMemo} from "react";
import Link from "next/link";

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

    return (
        <>
            {iso_dates.map((date_str, index) => (
                <div key={date_str}>
                    <Link href={`/?d=${date_str}`} className="text-blue-500 hover:underline">
                        [{index === 0 ? "Today" : (iso_dates.length - index)}] {date_str}
                    </Link>
                </div>
            ))}
        </>
    );
}
