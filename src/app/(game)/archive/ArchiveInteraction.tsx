"use client";

import {epoch_utc, time_zone} from "../../../../time";

import {ArchiveGrid} from "@/features/archive/ArchiveGrid";
import {useMemo, useState} from "react";

import {DiscordPresence} from "@/components/meta/DiscordPresence";

export const ArchiveInteraction = () => {
    const epoch_iso = useMemo(
        () => epoch_utc.toISOString().split("T")[0],
        []
    );

    const today_iso = useMemo(
        () => new Date().toLocaleDateString("en-CA", { timeZone: time_zone }),
        []
    );

    const [chosen_date, setChosenDate] = useState<string>("");

    return (
        <div className="flex flex-col h-full max-h-[85vh]">
            <DiscordPresence activity={{
                type: 4,
                details: "Browsing the archive",
            }} />

            <label className="shrink-0 mb-4 flex items-center justify-center gap-2">
                Jump to date:

                <input
                    type="date"
                    className="p-2 border rounded"
                    min={epoch_iso}
                    max={today_iso}
                    value={chosen_date}
                    onChange={(e) => setChosenDate(e.target.value)}
                />
            </label>

            <div className="flex-1 min-h-0 overflow-y-auto pr-4">
                <ArchiveGrid scroll_to_date={chosen_date} />
            </div>
        </div>
    );
}
