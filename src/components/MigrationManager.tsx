"use client";

import {useSearchParams, useRouter} from "next/navigation";
import {useEffect, useRef, useState} from "react";

import type {StatPositionFlags} from "@/components/Game";
import type {SaveState, SaveStateDay} from "@/hooks/useRangleState";

import {X} from "lucide-react";
import {decompressFromEncodedURIComponent} from "lz-string";

interface UnmappedSaveStateDay {
    c: string[]; // current_order_ids
    a: StatPositionFlags; // attempts
}

type UnmappedSaveState = Record<string, UnmappedSaveStateDay>;


const KEY_MAP = {
    c: "current_order_ids",
    a: "attempts",
} as const as Record<keyof UnmappedSaveStateDay, keyof SaveStateDay>;

export const MigrationManager = () => {
    const did_redirect = useRef(false);
    const did_migrate = useRef(false);

    const router = useRouter();
    const search_params = useSearchParams();

    const [banner_visible, setBannerVisible] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        if (did_redirect.current) {
            return;
        }
        did_redirect.current = true;

        if (window.location.hostname === "rangle.today" && !localStorage.getItem("migrated_from_ollieg")) {
            localStorage.setItem("migrated_from_ollieg", "true");
            window.location.assign("https://rangle.ollieg.codes");
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        if (did_migrate.current) {
            return;
        }
        did_migrate.current = true;

        const migration_data_comp = search_params.get("mig");
        if (!migration_data_comp) {
            return;
        }

        // decompress lz-string
        const migration_data_unmapped = JSON.parse(decompressFromEncodedURIComponent(migration_data_comp)) as UnmappedSaveState;

        // map the keys back to their original names in each sub-object
        const migration_data: SaveState = Object.fromEntries(
            Object.entries(migration_data_unmapped).map(([date, day_data]) => {
                const mapped_day_data: SaveStateDay = {} as SaveStateDay;
                for (const [short_key, value] of Object.entries(day_data)) {
                    const long_key = KEY_MAP[short_key as keyof UnmappedSaveStateDay];
                    mapped_day_data[long_key] = value;
                }
                return [date, mapped_day_data];
            })
        );

        const merged_state = migration_data;

        // if there is an existing localStorage state, merge the days (if date present in both, the local one wins)
        const existing_state_str = localStorage.getItem("rangle_state_v1");
        if (existing_state_str) {
            const existing_state = JSON.parse(existing_state_str) as SaveState;
            for (const [date, day_data] of Object.entries(existing_state)) {
                merged_state[date] = day_data;
            }
        }

        localStorage.setItem("rangle_state_v1", JSON.stringify(merged_state));

        // remove mig from url
        const new_search_params = new URLSearchParams(search_params.toString());
        new_search_params.delete("mig");
        router.replace("?" + new_search_params.toString());

        // if the router didnt do it for some reason, do it manually
        if (window.location.search.includes("mig=")) {
            window.history.replaceState({}, "", `${window.location.pathname}?${new_search_params.toString()}`);
        }

        setBannerVisible(true);
    }, [router, search_params]);

    if (!banner_visible) {
        return null;
    }

    return (
        <div className="bg-blue-800 text-white p-4 rounded mb-4 flex items-center justify-between gap-4">
            <p className="text-xs sm:text-sm">
                <span className="font-bold inline-block">rangle.today is the new home of Rangle!&nbsp;</span>
                <span className="inline-block">Your game data from the previous domain has been automatically migrated.</span>
            </p>

            <button className="cursor-pointer text-white opacity-75 hover:opacity-100 transition-opacity" title="Dismiss" onClick={() => setBannerVisible(false)}>
                <X />
            </button>
        </div>
    );
}
