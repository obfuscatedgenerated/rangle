"use client";

import {epoch_utc} from "../../time";
import { useState, useEffect } from "react";
import { PuzzleStat } from "@/components/Game";

// --- API Helpers ---

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const USER_AGENT = "Rangle Editor/1.0 (rangle@ollieg.codes)";

const searchWikidata = async (query: string) => {
    if (query.length < 3) return [];
    const params = new URLSearchParams({
        action: "wbsearchentities",
        search: query,
        language: "en",
        format: "json",
        origin: "*"
    });
    const res = await fetch(`${WIKIDATA_API}?${params}`, { headers: { "User-Agent": USER_AGENT } });
    const data = await res.json();
    return data.search || [];
};

/**
 * Fetches all claims for an item and resolves their labels
 */
const fetchItemClaims = async (qid: string) => {
    try {
        const res = await fetch(`${WIKIDATA_API}?action=wbgetentities&ids=${qid}&props=claims&format=json&origin=*`);
        const data = await res.json();
        if (!data.entities?.[qid]) return [];

        const claims = data.entities[qid].claims;
        const pIds = Object.keys(claims);

        // 1. Fetch labels for Properties and Units in one go
        // We collect all Unit QIDs from the claims to label them too
        const unitQids = new Set<string>();
        pIds.forEach(pId => {
            claims[pId].forEach((c: any) => {
                const unitUrl = c.mainsnak.datavalue?.value?.unit;
                if (unitUrl && unitUrl.includes('Q')) unitQids.add(unitUrl.split('/').pop());
            });
        });

        const allIds = [...pIds, ...unitQids];
        const labelData: any = { entities: {} };

        for (let i = 0; i < allIds.length; i += 50) {
            const chunk = allIds.slice(i, i + 50);
            const params = new URLSearchParams({
                action: "wbgetentities", ids: chunk.join('|'),
                props: "labels", languages: "en", format: "json", origin: "*"
            });
            const lRes = await fetch(`${WIKIDATA_API}?${params}`);
            const result = await lRes.json();
            Object.assign(labelData.entities, result.entities);
        }

        const entities = labelData.entities || {};

        // 2. Map and Normalize
        return pIds.map(pId => {
            const mainSnak = claims[pId][0].mainsnak;
            const datavalue = mainSnak.datavalue;
            const label = entities[pId]?.labels?.en?.value || pId;

            let value = null;
            let unitLabel = "";

            if (datavalue?.type === "quantity") {
                const dv = datavalue.value;
                // Use normalized value if available, fallback to raw amount
                // Normalized amounts are always in base units (meters, kg, etc.)
                value = parseFloat(dv.amount);

                const unitQid = dv.unit?.split('/').pop();
                unitLabel = entities[unitQid]?.labels?.en?.value || "";

            } else if (datavalue?.type === "time") {
                const timeStr = datavalue.value.time;
                const yearMatch = timeStr?.match(/[+-](\d{4})/);
                value = yearMatch ? parseInt(yearMatch[1]) : null;
                unitLabel = "year";
            }

            return { pId, label, value, unitLabel };
        }).filter(p => p.value !== null);

    } catch (err) {
        console.error("Wikidata Error:", err);
        return [];
    }
};

// --- Component ---

const EditableStat = ({ index, stat, updateStat }: {
    index: number;
    stat: PuzzleStat;
    updateStat: (index: number, newData: Partial<PuzzleStat>) => void
}) => {
    // Item Search State
    const [searchTerm, setSearchTerm] = useState(stat.name);
    const [results, setResults] = useState<any[]>([]);

    // Property/Metric State
    const [availableProperties, setAvailableProperties] = useState<any[]>([]);
    const [metricSearch, setMetricSearch] = useState(stat.metric);
    const [showMetricResults, setShowMetricResults] = useState(false);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm !== stat.name) {
                const searchResults = await searchWikidata(searchTerm);
                setResults(searchResults);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, stat.name]);

    const selectItem = async (item: any) => {
        updateStat(index, {
            id: item.id,
            name: item.label,
            description: item.description,
        });
        setSearchTerm(item.label);
        setResults([]);

        // Load properties for this specific item
        const props = await fetchItemClaims(item.id);
        setAvailableProperties(props);
    };

    const selectProperty = (prop: any) => {
        // Basic mapping for common units to suffixes
        const suffixMap: Record<string, string> = {
            "metre": " m",
            "kilogram": " kg",
            "kilometre": " km",
            "degree Celsius": "°C",
            "year": ""
        };

        updateStat(index, {
            metric: prop.label,
            value: prop.value,
            suffix: suffixMap[prop.unitLabel] || ` ${prop.unitLabel}`, // Auto-fill suffix
            unit_hint: prop.unitLabel ? `in ${prop.unitLabel}s` : ""   // Auto-fill hint
        });

        setMetricSearch(prop.label);
        setShowMetricResults(false);
    };

    const filteredProps = availableProperties.filter(p =>
        p.label.toLowerCase().includes(metricSearch.toLowerCase())
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-background-variant-border rounded-xl bg-background-variant backdrop-blur-sm shadow-sm">

            {/* ITEM SEARCH */}
            <div className="space-y-2 relative">
                <label className="text-xs font-bold uppercase opacity-50">Item Search</label>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search e.g. Platinum"
                    className="w-full p-2 border rounded bg-tertiary-background"
                />
                {results.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 border rounded shadow-lg max-h-40 overflow-y-auto bg-tertiary-background">
                        {results.map((item) => (
                            <div key={item.id} onClick={() => selectItem(item)}
                                 className="p-2 hover:bg-primary hover:text-white cursor-pointer text-sm border-b last:border-0 border-background-variant-border"
                            >
                                <div className="font-bold">{item.label}</div>
                                <div className="text-xs opacity-60 truncate">{item.description}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* METRIC / PROPERTY SEARCH */}
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1 relative">
                    <label className="text-xs font-bold opacity-50 uppercase">Metric</label>
                    <input
                        type="text"
                        value={metricSearch}
                        onFocus={() => setShowMetricResults(true)}
                        onChange={(e) => setMetricSearch(e.target.value)}
                        placeholder="Search Props..."
                        className="w-full p-2 border rounded bg-tertiary-background"
                    />
                    {showMetricResults && filteredProps.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 border rounded shadow-lg max-h-40 overflow-y-auto bg-tertiary-background">
                            {filteredProps.map((prop) => (
                                <div key={prop.pId} onClick={() => selectProperty(prop)}
                                     className="p-2 hover:bg-primary hover:text-white cursor-pointer text-sm border-b last:border-0 border-background-variant-border"
                                >
                                    <div className="font-bold">{prop.label}</div>
                                    <div className="text-xs opacity-60">Value: {prop.value}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold opacity-50 uppercase">Value</label>
                    <input
                        type="number"
                        value={stat.value}
                        onChange={(e) => updateStat(index, { value: Number(e.target.value) })}
                        className="w-full p-2 border rounded bg-tertiary-background font-mono"
                    />
                </div>
            </div>

            {/* METADATA */}
            <div className="md:col-span-2 grid grid-cols-3 gap-2">
                <input placeholder="Prefix" value={stat.prefix} onChange={(e) => updateStat(index, { prefix: e.target.value })}
                       className="p-2 text-sm border rounded bg-tertiary-background" />
                <input placeholder="Suffix" value={stat.suffix} onChange={(e) => updateStat(index, { suffix: e.target.value })}
                       className="p-2 text-sm border rounded bg-tertiary-background" />
                <input placeholder="Unit Hint" value={stat.unit_hint} onChange={(e) => updateStat(index, { unit_hint: e.target.value })}
                       className="p-2 text-sm border rounded bg-tertiary-background" />
            </div>

            <div className="md:col-span-2 flex items-center gap-4 mr-2">
                <input placeholder="Description" value={stat.description} onChange={(e) => updateStat(index, { description: e.target.value })}
                       className="md:col-span-2 p-2 text-sm border rounded bg-tertiary-background flex-1" />

                <input type="checkbox" checked={!!stat.bonus_round} onChange={(e) => updateStat(index, { bonus_round: e.target.checked })}
                       className="ml-2" /><span className="text-sm opacity-60">Bonus Round</span>
            </div>
        </div>
    );
};

export const EditorInteraction = () => {
    const [puzzle, setPuzzle] = useState<PuzzleStat[]>(
        Array(5).fill({
            id: "",
            name: "",
            value: 0,
            metric: "",
            description: "",
            prefix: "",
            suffix: "",
            unit_hint: ""
        })
    );

    const updateStat = (index: number, newData: Partial<PuzzleStat>) => {
        const newPuzzle = [...puzzle];
        newPuzzle[index] = { ...newPuzzle[index], ...newData };
        setPuzzle(newPuzzle);
    };

    const [iso_date, setIsoDate] = useState(new Date().toISOString().split('T')[0]);
    const [difficulty_string, setDifficultyString] = useState("Custom");
    const [neighbourhood_string, setNeighborhoodString] = useState("custom");

    const exportJson = () => {
        const days_since_epoch = Math.floor((new Date(iso_date).getTime() - epoch_utc.getTime()) / (1000 * 60 * 60 * 24));

        const fullPuzzle = {
            date: iso_date,
            number: days_since_epoch + 1,
            difficulty: difficulty_string,
            neighbourhood: neighbourhood_string,
            puzzle: puzzle
        };

        const blob = new Blob([JSON.stringify(fullPuzzle, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${iso_date}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6 min-h-screen">
            <div className="flex justify-between items-center">
                <label>
                    Date
                    <input
                        type="date"
                        className="ml-2 p-1 border rounded bg-tertiary-background"
                        value={iso_date}
                        onChange={(e) => setIsoDate(e.target.value)}
                    />
                </label>

                <label>
                    Difficulty
                    <input
                        type="text"
                        className="ml-2 p-1 border rounded bg-tertiary-background"
                        value={difficulty_string}
                        onChange={(e) => setDifficultyString(e.target.value)}
                        placeholder="e.g. Easy, Medium, Hard"
                    />
                </label>

                <label>
                    Neighbourhood
                    <input
                        type="text"
                        className="ml-2 p-1 border rounded bg-tertiary-background"
                        value={neighbourhood_string}
                        onChange={(e) => setNeighborhoodString(e.target.value)}
                        placeholder="e.g. small, medium, large"
                    />
                </label>

                <button
                    onClick={exportJson}
                    className="bg-primary fg-on-primary px-6 py-2 rounded-full font-bold  transition cursor-pointer"
                >
                    Export JSON
                </button>
            </div>

            <div className="space-y-4">
                {puzzle.map((stat, i) => (
                    <div key={i} style={{ zIndex: 5 - i, position: 'relative' }}>
                        <EditableStat index={i} stat={stat} updateStat={updateStat} />
                    </div>
                ))}
            </div>
        </div>
    );
};

// this is mostly vibe coded, sorry!
// i don't typically like to, but it works nicely as a quick tool to create puzzles by hand

// TODO: add neighbourhood and difficulty helpers to suggest value ranges
// TODO: add shuffle / spread helper
