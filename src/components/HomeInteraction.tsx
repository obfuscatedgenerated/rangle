"use client";

import {Header} from "@/components/Header";
import {Game} from "@/components/Game";
import {MigrationManager} from "@/components/MigrationManager";
import {LoadingSpinner} from "@/components/LoadingSpinner";

import {useEffect, useMemo, useState} from "react";
import {useSearchParams, useRouter} from "next/navigation";

import {epoch_utc, time_zone} from "../../time";
import {ChangelogWidget} from "@/components/ChangelogWidget";
import {useCloudSync} from "@/context/CloudSyncContext";

export const HomeInteraction = () => {
    const search_params = useSearchParams();
    const router = useRouter();

    // returns undefined if none set, null if invalid (and should be removed from url), or the date string if valid
    const validated_archive_date = useMemo(
        () => {
            const date_str = search_params.get("d");
            if (!date_str) {
                return undefined;
            }

            // validate format is YYYY-MM-DD
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date_str)) {
                console.warn("Invalid date format in search params, expected YYYY-MM-DD:", date_str);
                return null;
            }

            // validate constructed date is valid
            if (isNaN(new Date(`${date_str}T00:00:00Z`).getTime())) {
                console.warn("Invalid date in search params:", date_str);
                return null;
            }

            // check if the game file exists for the date, if not, return undefined
            // this is just done mathematically for now by checking its within the range of the epoch and today
            // ideally it'd go fetch the file but that would require making this function async
            // future dates can be fetched if the secret flag is present (for testing future puzzles)
            const today_iso = new Date().toLocaleDateString("en-CA", { timeZone: time_zone });
            const epoch_iso = epoch_utc.toISOString().split("T")[0];
            if (date_str < epoch_iso || (date_str > today_iso && !search_params.has("super_secret_time_travel"))) {
                console.warn("Date in search params is out of range:", date_str);
                return null;
            }

            // if the date is today, avoid treating it as an archive date
            if (date_str === today_iso) {
                console.warn("Date in search params is today, treating as not archived:", date_str);
                return null;
            }

            return date_str;
        },
        [search_params]
    );

    // if the date param is invalid, remove it from the url
    useEffect(() => {
        if (validated_archive_date === null) {
            // remove the invalid date param from the url
            const new_search_params = new URLSearchParams(search_params.toString());
            new_search_params.delete("d");
            router.replace(`/?${new_search_params.toString()}`);

            // if the router didnt do it for some reason, do it manually
            if (window.location.search.includes("d=")) {
                window.history.replaceState({}, "", `/?${new_search_params.toString()}`);
            }
        }
    }, [validated_archive_date, search_params, router]);

    const [loaded, setLoaded] = useState(false);

    // trigger full cloud sync on load if ready
    const {trigger_full_sync, status} = useCloudSync();
    useEffect(() => {
        if (status === "idle") {
            trigger_full_sync();
        }
    }, [status, trigger_full_sync]);

    return (
        <>
            <Header />

            <ChangelogWidget />

            <main className="flex-1 flex-col mx-4 my-0 pb-8 sm:pb-0 flex items-center justify-center">
                <MigrationManager />

                {!loaded && <LoadingSpinner className="mt-4" />}

                <Game archive_date={validated_archive_date || undefined} on_loaded={() => setLoaded(true)} />

                {loaded && <p className="sm:fixed left-2 bottom-2 opacity-75 text-xs sm:text-base">Powered by <a href="https://www.wikidata.org/" target="_blank" rel="noopener noreferrer" className="underline">Wikidata</a></p>}
            </main>
        </>
    );
}
