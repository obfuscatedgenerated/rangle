"use client";

import {useCallback, useEffect, useState} from "react";

import {Game, TodayData} from "@/features/game/Game";
import {VirtualRangleStateProvider} from "@/context/RangleStateContext";
import {LoadingSpinner} from "@/components/ui/LoadingSpinner";
import {useSearchParams} from "next/navigation";
import {safe_atob, safe_btoa} from "@/util/base64";
import {Save} from "lucide-react";

const TestRun = ({json_data}: { json_data: TodayData }) => {
    const export_json = useCallback(
        () => {
            const blob = new Blob([JSON.stringify(json_data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${json_data.date}.json`;
            a.click();
            URL.revokeObjectURL(url);
        },
        [json_data]
    );

    return (
        <VirtualRangleStateProvider data={json_data}>
            <button
                onClick={export_json}
                className="mt-4 mb-6 bg-primary fg-on-primary px-6 py-2 rounded-full font-bold transition cursor-pointer flex items-center gap-2"
            >
                <Save className="w-4 h-4"/>

                Export JSON
            </button>

            <Game archive_date={json_data.date} leaderboard_is_open={false} open_leaderboard={() => {}} close_leaderboard={() => {}}/>
        </VirtualRangleStateProvider>
    );
};

export const TestRunInteraction = () => {
    const [json_data, setJsonData] = useState<TodayData | null>(null);

    const search_params = useSearchParams();
    const [search_params_checked, setSearchParamsChecked] = useState(false);

    const [processing_file, setProcessingFile] = useState(false);

    // try parsing json from url data
    useEffect(() => {
        const url_data_b64 = search_params.get("data");
        if (!url_data_b64) {
            setSearchParamsChecked(true);
            return;
        }

        try {
            const url_data = safe_atob(url_data_b64);
            const parsed_data = JSON.parse(url_data);
            setJsonData(parsed_data);
        } catch (err) {
            console.error("Error parsing JSON from URL parameter:", err);
        }

        setSearchParamsChecked(true);
    }, [search_params]);

    if (json_data) {
        return <TestRun json_data={json_data}/>;
    }

    if (!search_params_checked) {
        return <LoadingSpinner className="mt-4" />;
    }

    return (
        <label
            className="flex flex-col items-center justify-center mt-8 cursor-pointer rounded-lg border-2 border-dashed border-gray-400 p-6 text-center hover:border-gray-600">
            Upload puzzle JSON
            {processing_file && <LoadingSpinner className="mt-4"/>}

            <input className="hidden" type="file" accept=".json" onChange={(e) => {
                setProcessingFile(true);
                const file = e.target.files?.[0] || null;

                if (!file) {
                    setProcessingFile(false);
                    setJsonData(null);
                    return;
                }

                const reader = new FileReader();

                reader.onload = () => {
                    if (typeof reader.result === "string") {
                        try {
                            const parsed_data = JSON.parse(reader.result);
                            setJsonData(parsed_data);

                            // add the json data to the url without invoking the search params effect
                            const new_url = new URL(window.location.href);
                            new_url.searchParams.set("data", safe_btoa(reader.result));
                            window.history.replaceState({}, "", new_url.toString());
                        } catch (err) {
                            console.error("Error parsing JSON:", err);
                            setJsonData(null);
                        }
                    } else {
                        console.error("Unexpected file reader result type:", typeof reader.result);
                    }

                    setProcessingFile(false);
                };

                reader.onerror = () => {
                    console.error("Error reading file:", reader.error);
                    setProcessingFile(false);
                };

                reader.readAsText(file);
            }}/>
        </label>
    );
}
