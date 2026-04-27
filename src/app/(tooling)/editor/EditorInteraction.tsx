"use client";

import {epoch_utc} from "../../../../time";
import {useState, useEffect, useCallback} from "react";
import { PuzzleStat } from "@/features/game/Game";
import {Play, Save, Shuffle, Upload} from "lucide-react";
import {ToggleSwitch} from "@/components/ui/ToggleSwitch";

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

const EditableStat = ({ index, stat, updateStat, show_values }: {
    index: number;
    stat: PuzzleStat;
    updateStat: (index: number, newData: Partial<PuzzleStat>) => void,
    show_values: boolean;
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

    // if stat.name changes, update the input field to reflect that (e.g. when shuffling)
    useEffect(() => {
        setSearchTerm(stat.name);
    }, [stat.name]);

    // if metric changes, update metric search to reflect that (e.g. when shuffling)
    useEffect(() => {
        setMetricSearch(stat.metric);
    }, [stat.metric]);

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
        const prefix_map: Record<string, string> = {
            "United States dollar": "$",
        }

        const suffix_map: Record<string, string> = {
            "metre": " m",
            "kilogram": " kg",
            "kilometre": " km",
            "degree Celsius": "°C",
            "year": ""
        };

        const unit_hint_map: Record<string, string> = {
            "year": "",
            "United States dollar": "in dollars",
        };

        const metric_prefix_map: Record<string, string> = {
            "year": "year of ",
        };

        const metric_replacement_map: Record<string, string> = {
            "time of discovery or invention": "discovery or invention",
        };

        const replaced_metric = metric_replacement_map[prop.label] || prop.label;
        const metric_prefix = metric_prefix_map[prop.unitLabel] || "";

        updateStat(index, {
            metric: `${metric_prefix}${replaced_metric}`,
            value: prop.value,
            prefix: prefix_map[prop.unitLabel] !== undefined ? prefix_map[prop.unitLabel] : "",
            suffix: suffix_map[prop.unitLabel] !== undefined ? suffix_map[prop.unitLabel] : "",
            unit_hint: prop.unitLabel ? (unit_hint_map[prop.unitLabel] !== undefined ? unit_hint_map[prop.unitLabel] : `in ${prop.unitLabel}s`) : ""   // Auto-fill hint
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
                    placeholder="Search name or class ID..."
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
                        onChange={(e) => {
                            setMetricSearch(e.target.value);

                            // sync stat.metric to what's typed into the field to allow for renaming a selected stat
                            if (stat.metric !== e.target.value) {
                                updateStat(index, { metric: e.target.value });
                            }
                        }}
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
                                    {show_values && <div className="text-xs opacity-60">Value: {prop.value}</div>}
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
                        className={`w-full p-2 border rounded bg-tertiary-background font-mono ${show_values ? "" : "text-transparent"}`}
                    />
                </div>
            </div>

            {/* METADATA */}
            <div className="md:col-span-2 grid grid-cols-3 gap-2">
                <input placeholder="Prefix (shown when revealed)" value={stat.prefix} onChange={(e) => updateStat(index, { prefix: e.target.value })}
                       className="p-2 text-sm border rounded bg-tertiary-background" />
                <input placeholder="Suffix (shown when revealed)" value={stat.suffix} onChange={(e) => updateStat(index, { suffix: e.target.value })}
                       className="p-2 text-sm border rounded bg-tertiary-background" />
                <input placeholder="Unit Hint (always shown)" value={stat.unit_hint || ""} onChange={(e) => updateStat(index, { unit_hint: e.target.value })}
                       className="p-2 text-sm border rounded bg-tertiary-background" />
            </div>

            <div className="sm:col-span-3 flex items-center gap-4 mr-2 flex-col sm:flex-row">
                <input placeholder="Description (always shown)" value={stat.description} onChange={(e) => updateStat(index, { description: e.target.value })}
                       className="w-full p-2 text-sm border rounded bg-tertiary-background flex-1" />

                <div className="flex items-center gap-2">
                    <input id={`bonus-${index}`} type="checkbox" checked={!!stat.bonus_round} onChange={(e) => updateStat(index, { bonus_round: e.target.checked })}
                       className="ml-2" />
                    <label htmlFor={`bonus-${index}`} className="text-sm opacity-60">Bonus Round</label>
                </div>
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

    const get_json = useCallback(
        () => {
            const days_since_epoch = Math.floor((new Date(iso_date).getTime() - epoch_utc.getTime()) / (1000 * 60 * 60 * 24));

            return {
                date: iso_date,
                number: days_since_epoch + 1,
                difficulty: difficulty_string,
                neighbourhood: neighbourhood_string,
                puzzle: puzzle
            };
        },
        [iso_date, difficulty_string, neighbourhood_string, puzzle]
    );

    const export_json = useCallback(
        () => {
            const blob = new Blob([JSON.stringify(get_json(), null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${iso_date}.json`;
            a.click();
            URL.revokeObjectURL(url);
        },
        [get_json, iso_date]
    );

    const shuffle_puzzle = useCallback(
        () => {
            // shuffle but check that 2 or less items are in the correct position
            const shuffled = [...puzzle];
            let give_up_counter = 0;
            do {
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
            } while (give_up_counter++ < 25 && shuffled.filter((s, i) => s.id === puzzle[i].id).length > 2);

            setPuzzle(shuffled);
        },
        [puzzle]
    );

    const test_run = useCallback(
        () => {
            const url = new URL("/testrun", window.location.origin);
            url.searchParams.set("data", btoa(JSON.stringify(get_json())));
            window.open(url.toString(), "_blank");
        },
        [get_json]
    );

    const [show_values, setShowValues] = useState(true);

    return (
        <div className="mx-auto p-6 gap-8 min-h-screen flex flex-col items-center">
            <div className="flex justify-center items-center gap-5 flex-wrap text-sm sm:text-base">
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
            </div>

            <div className="flex justify-center items-center gap-5 flex-wrap text-sm sm:text-base">
                <button
                    onClick={shuffle_puzzle}
                    className="bg-primary fg-on-primary px-6 py-2 rounded-full font-bold transition cursor-pointer flex items-center gap-2"
                >
                    <Shuffle className="w-4 h-4" />

                    Shuffle
                </button>

                <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (!file) return;

                        const reader = new FileReader();
                        reader.onload = () => {
                            if (typeof reader.result === "string") {
                                try {
                                    const parsed_data = JSON.parse(reader.result);
                                    setIsoDate(parsed_data.date || iso_date);
                                    setDifficultyString(parsed_data.difficulty || difficulty_string);
                                    setNeighborhoodString(parsed_data.neighbourhood || neighbourhood_string);
                                    setPuzzle(parsed_data.puzzle || puzzle);
                                } catch (err) {
                                    console.error("Error parsing JSON:", err);
                                }
                            }
                        };
                        reader.readAsText(file);
                    }}
                    className="hidden"
                    id="file-upload"
                />
                <label htmlFor="file-upload" className="bg-primary fg-on-primary px-6 py-2 rounded-full font-bold transition cursor-pointer flex items-center gap-2">
                    <Upload className="w-4 h-4" />

                    Open JSON
                </label>

                <button
                    onClick={export_json}
                    className="bg-primary fg-on-primary px-6 py-2 rounded-full font-bold transition cursor-pointer flex items-center gap-2"
                >
                    <Save className="w-4 h-4"  />

                    Export JSON
                </button>

                <button
                    onClick={test_run}
                    className="bg-primary fg-on-primary px-6 py-2 rounded-full font-bold transition cursor-pointer flex items-center gap-2"
                >
                    <Play className="w-4 h-4" />

                    Test run
                </button>

                <ToggleSwitch value={show_values} on_toggle={setShowValues}>
                    Show values
                </ToggleSwitch>
            </div>

            <div className="space-y-4 max-w-5xl">
                {puzzle.map((stat, i) => (
                    <div key={i} style={{ zIndex: 5 - i, position: "relative" }}>
                        <EditableStat index={i} stat={stat} updateStat={updateStat} show_values={show_values} />
                    </div>
                ))}
            </div>
        </div>
    );
};

// this is mostly vibe coded, sorry!
// i don't typically like to, but it works nicely as a quick tool to create puzzles by hand

// TODO: add neighbourhood and difficulty helpers to suggest value ranges
// TODO: add spread helper
