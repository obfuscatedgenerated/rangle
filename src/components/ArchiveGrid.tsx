"use client";

import EPOCH from "../../epoch";

import {useEffect, useMemo, useRef, useState} from "react";
import Link from "next/link";

import {ScoreStateDay} from "@/hooks/useRangleState";
import {useRangleScores} from "@/hooks/useRangleScores";
import {LoadingSpinner} from "@/components/LoadingSpinner";
import {PuzzleCountdown} from "@/components/PuzzleCountdown";

interface MetadataDay {
    number: number;
    difficulty: string;
    neighbourhood: string;
}

interface MetadataFile {
    time: string;
    count: number;
    days: {[date_str: string]: MetadataDay};
}

interface ArchiveTileProps {
    date_str: string;
    metadata: MetadataDay;
    score?: ScoreStateDay;
    set_ref?: (date_str: string, ref: HTMLAnchorElement | null) => void;
    link_className?: string;
    box_className?: string;
}

const ArchiveTile = ({
    date_str,
    metadata,
    score,
    set_ref,
    link_className = "",
    box_className = "",
}: ArchiveTileProps) => {
    const date_value = useMemo(() => {
        return new Date(`${date_str}T00:00:00Z`);
    }, [date_str]);

    const formatted_date = useMemo(
        () => {
            return date_value.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
        },
        [date_value]
    );

    const days_ago = useMemo(
        () => {
            const today = new Date();
            const diff_time = today.getTime() - date_value.getTime();
            return Math.floor(diff_time / (1000 * 60 * 60 * 24));
        },
        [date_value]
    );

    return (
        <Link href={`/?d=${date_str}`} title={`Play Rangle #${metadata.number} from ${formatted_date}`} ref={(el) => set_ref?.(date_str, el)} className={link_className}>
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
                    : score && score.result === undefined
                    ? "bg-yellow-100 dark:bg-yellow-900/50 border-yellow-400 dark:border-yellow-700"
                    : "bg-gray-100 dark:bg-gray-900/50 border-gray-300 dark:border-gray-700"
                }
                ${box_className}
            `}>
                <div>
                    <h2 className="font-bold sm:text-lg">Rangle #{metadata.number}</h2>
                    <h3 className="font-bold text-sm sm:text-base">{formatted_date}</h3>

                    {score ? (
                        <p className="text-sm opacity-70">
                            {score.result === undefined
                                ? `In Progress (${score.attempts} attempt${score.attempts !== 1 ? "s" : ""})`
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
                    }  • {metadata.difficulty}
                </p>
            </div>
        </Link>
    );
}

interface ArchiveGridProps {
    scroll_to_date?: string;
}

export const ArchiveGrid = ({scroll_to_date}: ArchiveGridProps) => {
    const [metadata, setMetadata] = useState<MetadataFile | null>(null);

    useEffect(() => {
        fetch("/daily/meta.json")
            .then((res) => res.json())
            .then((data) => setMetadata(data))
            .catch((err) => {
                console.error("Error fetching metadata:", err);
                setMetadata(null);
            });
    }, []);

    const iso_dates = useMemo(() => {
        if (!metadata) {
            return [];
        }

        return Object.keys(metadata.days).filter((date_str) => {
            // make sure to only include current dates
            // TODO: should meta.json just exclude future days to avoid this computation?
            const date = new Date(`${date_str}T00:00:00Z`);
            const today = new Date();

            return date >= EPOCH && date < today;
        }).reverse();
    }, [metadata]);

    const {scores} = useRangleScores();

    // date -> item ref for scrolling into view
    const item_refs = useRef<Map<string, HTMLAnchorElement>>(new Map());

    useEffect(() => {
        if (scroll_to_date) {
            const ref = item_refs.current.get(scroll_to_date);
            console.log("Scrolling to date", scroll_to_date, ref);
            if (ref) {
                ref.scrollIntoView({behavior: "smooth", block: "center"});
            }
        }
    }, [scroll_to_date]);

    if (metadata === null || scores === null) {
        return <LoadingSpinner />;
    }

    // TODO: lazy load? wont worry til gets bigger
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            <PuzzleCountdown />

            {iso_dates.map((date_str) => (
                <ArchiveTile
                    key={date_str}
                    date_str={date_str}
                    metadata={metadata.days[date_str]}
                    score={scores[date_str]}
                    set_ref={(date_str, ref) => {
                        if (ref) {
                            item_refs.current.set(date_str, ref);
                        } else {
                            item_refs.current.delete(date_str);
                        }
                    }}
                    box_className={date_str === scroll_to_date ? "ring-4 ring-blue-400 dark:ring-blue-700" : ""}
                />
            ))}
        </div>
    );
}
