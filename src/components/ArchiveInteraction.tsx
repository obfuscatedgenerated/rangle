"use client";

import EPOCH from "../../epoch";

import {ArchiveGrid} from "@/components/ArchiveGrid";
import {useMemo, useState} from "react";

export const ArchiveInteraction = () => {
    const epoch_iso = useMemo(
        () => EPOCH.toISOString().split("T")[0],
        []
    );

    const today_iso = useMemo(
        () => new Date().toISOString().split("T")[0],
        []
    );

    const [chosen_date, setChosenDate] = useState<string>("");

    return (
        <div className="flex flex-col">
            <label className="mb-4 flex items-center justify-center gap-2">
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

            <ArchiveGrid scroll_to_date={chosen_date} />
        </div>
    );
}
