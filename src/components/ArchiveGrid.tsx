"use client";

import EPOCH from "../../epoch";

import {useMemo} from "react";
import Link from "next/link";

import {ScoreStateDay} from "@/hooks/useRangleState";
import {useRangleScores} from "@/hooks/useRangleScores";
import {LoadingSpinner} from "@/components/LoadingSpinner";

interface ArchiveTileProps {
    date_str: string;
    index: number;
    total: number;
    score?: ScoreStateDay;
}

const ArchiveTile = ({
    date_str,
    index,
    total,
    score,
}: ArchiveTileProps) => {
    const formatted_date = useMemo(
        () => {
            const date = new Date(`${date_str}T00:00:00Z`);
            return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
        },
        [date_str]
    );

    const rangle_number = useMemo(
        () => {
            const date = new Date(`${date_str}T00:00:00Z`);
            const diff_time = date.getTime() - EPOCH.getTime();
            return Math.floor(diff_time / (1000 * 60 * 60 * 24)) + 1;
        },
        [date_str]
    );

    const days_ago = useMemo(
        () => {
            const date = new Date(`${date_str}T00:00:00Z`);
            const today = new Date();
            const diff_time = today.getTime() - date.getTime();
            return Math.floor(diff_time / (1000 * 60 * 60 * 24));
        },
        [date_str]
    );

    return (
        <Link href={`/?d=${date_str}`} title={`Play Rangle #${rangle_number} from ${formatted_date}`}>
            <div className={`
                aspect-square
                rounded-lg
                border-2 
                p-4
                flex
                flex-col
                justify-between
                ${score && score.result === true
                    ? "bg-green-100 dark:bg-green-900/50 border-green-400 dark:border-green-700"
                    : score && score.result === false
                    ? "bg-red-100 dark:bg-red-900/50 border-red-400 dark:border-red-700"
                    : "bg-gray-100 dark:bg-gray-900/50 border-gray-300 dark:border-gray-700"
                }
            `}>
                <div>
                    <h2 className="font-bold sm:text-lg">Rangle #{rangle_number}</h2>
                    <h3 className="font-bold text-sm sm:text-base">{formatted_date}</h3>

                    {score ? (
                        <p className="text-sm opacity-70">
                            {score.result === undefined
                                ? `In Progress (${score.attempts} attempts)`
                                : score.result ? `✅ ${score.attempts}/5` : "❌ X/5"
                            }
                        </p>
                    ) : (
                        <p className="text-sm opacity-70">Not Played</p>
                    )}
                </div>

                <p className="text-xs opacity-50">
                    {days_ago === 0
                        ? "Today"
                        : `${days_ago} day${days_ago !== 1 ? "s" : ""} ago`
                    }
                </p>
            </div>
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

    const {scores} = useRangleScores();

    if (scores === null) {
        return <LoadingSpinner />;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {iso_dates.map((date_str, index) => (
                <ArchiveTile
                    key={date_str}
                    date_str={date_str}
                    index={index}
                    total={iso_dates.length}
                    score={scores[date_str]}
                />
            ))}
        </div>
    );
}
