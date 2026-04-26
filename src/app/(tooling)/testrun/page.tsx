"use client";

import {useEffect, useState} from "react";

import {Game, TodayData} from "@/components/Game";
import {VirtualRangleStateProvider} from "@/context/RangleStateContext";
import {VirtualSettingsProvider} from "@/context/SettingsContext";
import {LoadingSpinner} from "@/components/LoadingSpinner";

const TestRun = ({ file }: { file: File }) => {
    const [json_data, setJsonData] = useState<TodayData | null>(null);

    useEffect(() => {
        const reader = new FileReader();

        reader.onload = () => {
            if (typeof reader.result === "string") {
                try {
                    const parsed_data = JSON.parse(reader.result);
                    setJsonData(parsed_data);
                } catch (err) {
                    console.error("Error parsing JSON:", err);
                    setJsonData(null);
                }
            } else {
                console.error("Unexpected file reader result type:", typeof reader.result);
            }
        };

        reader.onerror = () => {
            console.error("Error reading file:", reader.error);
        };

        reader.readAsText(file);
    }, [file]);

    if (!json_data) {
        return <LoadingSpinner />;
    }

    return (
        <VirtualRangleStateProvider data={json_data}>
            <Game archive_date={json_data.date} leaderboard_is_open={false} open_leaderboard={() => {}} close_leaderboard={() => {}} />
        </VirtualRangleStateProvider>
    );
};

export default function TestRunPage() {
    const [file, setFile] = useState<File | null>(null);

    return (
        <VirtualSettingsProvider>
            <main className="flex-1 flex-col m-4 pb-8 sm:pb-0 flex items-center justify-center">
                <h1 className="font-title text-3xl sm:text-4xl mb-1 mx-4 sm:mx-6 font-bold">Test Run</h1>

                {file ? (
                    <TestRun file={file} />
                ) : (
                    <label className="flex flex-col items-center justify-center mt-8 cursor-pointer rounded-lg border-2 border-dashed border-gray-400 p-6 text-center hover:border-gray-600">
                        Upload puzzle JSON

                        <input className="hidden" type="file" accept=".json" onChange={(e) => {
                            const selectedFile = e.target.files?.[0] || null;
                            setFile(selectedFile);
                        }}/>
                    </label>
                )}
            </main>
        </VirtualSettingsProvider>
    );
}
