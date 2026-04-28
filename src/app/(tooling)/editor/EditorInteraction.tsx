"use client";

import {epoch_utc} from "../../../../time";
import {useState, useEffect, useCallback, useRef, useMemo} from "react";
import { PuzzleStat } from "@/features/game/Game";
import {ArrowDown, ArrowUp, Asterisk, Play, Save, Shuffle, Upload} from "lucide-react";
import {ToggleSwitch} from "@/components/ui/ToggleSwitch";
import {safe_btoa} from "@/util/base64";
import {NewTabLink} from "@/components/ui/NewTabLink";

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
    const [show_item_results, setShowItemResults] = useState(false);
    const [showMetricResults, setShowMetricResults] = useState(false);
    const [original_label, setOriginalLabel] = useState(stat.name);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm !== original_label) {
                const searchResults = await searchWikidata(searchTerm);
                setResults(searchResults);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [original_label, searchTerm]);

    const selectItem = async (item: any) => {
        updateStat(index, {
            id: item.id,
            name: item.label,
            description: item.description,
        });
        setOriginalLabel(item.label);
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
            "inception": "inception or creation"
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
        <div className="grid grid-cols-3 md:grid-cols-8 gap-4 p-4 border border-background-variant-border rounded-xl bg-background-variant backdrop-blur-sm shadow-sm">
            <div className="space-y-2 relative col-span-1">
                <label className="text-xs font-bold uppercase opacity-50">ID</label>
                <input
                    type="text"
                    value={stat.id || "No ID!"}
                    className={`w-full p-2 border rounded text-foreground/50 ${stat.id ? "font-mono bg-tertiary-background text-on-tertiary-background" : "italic border-red-500 bg-lost text-on-lost"}`}
                    readOnly
                />
            </div>


            {/* ITEM SEARCH */}
            <div className="space-y-2 relative col-span-3">
                <label className="text-xs font-bold uppercase opacity-50">Item</label>
                <div className="relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onFocus={() => setShowItemResults(true)}
                        onBlur={() => setTimeout(() => setShowItemResults(false), 200)} // delay to allow click
                        onChange={(e) => {
                            setSearchTerm(e.target.value);

                            // sync stat.name to what's typed into the field to allow for renaming a selected stat
                            if (stat.name !== e.target.value) {
                                updateStat(index, { name: e.target.value });
                            }
                        }}
                        placeholder="Search name or class ID..."
                        className="w-full p-2 border rounded bg-tertiary-background text-on-tertiary-background"
                    />
                    {stat.id && searchTerm !== original_label && (
                        <span title="Renamed from original Wikidata label" className="absolute top-1/2 right-1 -translate-y-1/2 opacity-50">
                            <Asterisk />
                        </span>
                    )}
                </div>
                {show_item_results && results.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 border rounded shadow-lg max-h-40 overflow-y-auto bg-tertiary-background text-on-tertiary-background">
                        {results.map((item) => (
                            <div key={item.id} onClick={() => selectItem(item)}
                                 className="p-2 hover:bg-primary hover:text-white cursor-pointer text-sm border-b last:border-0 border-background-variant-border"
                            >
                                <div className="font-bold">{item.label} [{item.id}]</div>
                                <div className="text-xs opacity-60 truncate">{item.description}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* METRIC / PROPERTY SEARCH */}
            <div className="grid grid-cols-3 gap-2 col-span-4">
                <div className="space-y-1 relative col-span-2">
                    <label className="text-xs font-bold opacity-50 uppercase">Metric</label>
                    <input
                        type="text"
                        value={metricSearch}
                        onFocus={() => setShowMetricResults(true)}
                        onBlur={() => setTimeout(() => setShowMetricResults(false), 200)} // delay to allow click
                        onChange={(e) => {
                            setMetricSearch(e.target.value);

                            // sync stat.metric to what's typed into the field to allow for renaming a selected stat
                            if (stat.metric !== e.target.value) {
                                updateStat(index, { metric: e.target.value });
                            }
                        }}
                        placeholder="Search properties..."
                        className="w-full p-2 border rounded bg-tertiary-background text-on-tertiary-background"
                    />
                    {showMetricResults && filteredProps.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 border rounded shadow-lg max-h-40 overflow-y-auto bg-tertiary-background text-on-tertiary-background">
                            {filteredProps.map((prop) => (
                                <div key={prop.pId} onClick={() => selectProperty(prop)}
                                     className="p-2 hover:bg-primary hover:text-white cursor-pointer text-sm border-b last:border-0 border-background-variant-border"
                                >
                                    <div className="font-bold">{prop.label} [{prop.pId}]</div>
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
                        className={`w-full p-2 border rounded bg-tertiary-background font-mono ${show_values ? "text-on-tertiary-background" : "text-transparent"}`}
                    />
                </div>
            </div>

            {/* METADATA */}
            <div className="md:col-span-8 col-span-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                <input placeholder="Prefix (shown when revealed)" value={stat.prefix} onChange={(e) => updateStat(index, { prefix: e.target.value })}
                       className="p-2 text-sm border rounded bg-tertiary-background text-on-tertiary-background" />
                <input placeholder="Suffix (shown when revealed)" value={stat.suffix} onChange={(e) => updateStat(index, { suffix: e.target.value })}
                       className="p-2 text-sm border rounded bg-tertiary-background text-on-tertiary-background" />
                <input placeholder="Unit Hint (always shown)" value={stat.unit_hint || ""} onChange={(e) => updateStat(index, { unit_hint: e.target.value })}
                       className="p-2 text-sm border rounded bg-tertiary-background text-on-tertiary-background col-span-2" />
            </div>

            <div className="sm:col-span-8 col-span-4 flex items-center gap-4 mr-2 flex-col sm:flex-row">
                <input placeholder="Description (always shown)" value={stat.description} onChange={(e) => updateStat(index, { description: e.target.value })}
                       className="w-full p-2 text-sm border rounded bg-tertiary-background text-on-tertiary-background flex-1" />

                <ToggleSwitch value={!!stat.bonus_round} on_toggle={(val) => updateStat(index, { bonus_round: val })} title="Mark this stat to be played in the bonus round. If the player beats the Rangle, all bonus round values are kept secret and the player must guess them!">
                    Bonus round
                </ToggleSwitch>
            </div>

            {stat.id ? (
                <NewTabLink className="col-span-3 md:col-span-8 text-center underline" href={`https://wikidata.org/wiki/${stat.id}`}>
                    Open {original_label} on Wikidata
                </NewTabLink>
            ) : (
                <div className="col-span-3 md:col-span-8 text-center opacity-50">
                    (no item selected yet)
                </div>
            )}
        </div>
    );
};

export const EditorInteraction = () => {
    const [puzzle, setPuzzle] = useState<(PuzzleStat & {render_key: number})[]>(
        Array(5).fill(null).map((_, i) => ({
            render_key: i,
            id: "",
            name: "",
            description: "",
            metric: "",
            value: 0,
            prefix: "",
            suffix: "",
            unit_hint: "",
        }))
    );

    const some_no_id = useMemo(
        () => puzzle.some(stat => !stat.id),
        [puzzle]
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
            if (puzzle.some(stat => !stat.id)) {
                alert("Not all stats have an associated Wikidata ID!");
                return null;
            }

            const days_since_epoch = Math.floor((new Date(iso_date).getTime() - epoch_utc.getTime()) / (1000 * 60 * 60 * 24));

            return {
                date: iso_date,
                number: days_since_epoch + 1,
                difficulty: difficulty_string,
                neighbourhood: neighbourhood_string,
                puzzle: puzzle.map(({ render_key, ...stat }) => stat),  // strip render keys
            };
        },
        [iso_date, difficulty_string, neighbourhood_string, puzzle]
    );

    const export_json = useCallback(
        () => {
            const json = get_json();
            if (!json) {
                return;
            }

            const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
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
            const json = get_json();
            if (!json) {
                return;
            }

            const url = new URL("/testrun", window.location.origin);
            url.searchParams.set("data", safe_btoa(JSON.stringify(json)));
            window.open(url.toString(), "_blank");
        },
        [get_json]
    );

    const [show_values, setShowValues] = useState(true);

    return (
        <div className="mx-auto p-1 sm:p-6 gap-8 min-h-screen flex flex-col items-center">
            <div className="flex justify-center items-center gap-5 flex-wrap text-sm sm:text-base">
                <label>
                    Date
                    <input
                        type="date"
                        className="ml-2 p-1 border rounded bg-tertiary-background text-on-tertiary-background"
                        value={iso_date}
                        onChange={(e) => setIsoDate(e.target.value)}
                    />
                </label>

                <label>
                    Difficulty
                    <input
                        type="text"
                        className="ml-2 p-1 border rounded bg-tertiary-background text-on-tertiary-background"
                        value={difficulty_string}
                        onChange={(e) => setDifficultyString(e.target.value)}
                        placeholder="e.g. Easy, Medium, Hard"
                    />
                </label>

                <label>
                    Neighbourhood
                    <input
                        type="text"
                        className="ml-2 p-1 border rounded bg-tertiary-background text-on-tertiary-background"
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

                {/* TODO: make button a component, it looks nice */}
                <button
                    disabled={some_no_id}
                    onClick={export_json}
                    className="bg-primary fg-on-primary px-6 py-2 rounded-full font-bold transition cursor-pointer flex items-center gap-2 disabled:bg-gray-500 disabled:text-gray-700 disabled:cursor-not-allowed"
                    title={some_no_id ? "Please assign Wikidata IDs to all stats before exporting!" : ""}
                >
                    <Save className="w-4 h-4"  />

                    Export JSON
                </button>

                <button
                    disabled={some_no_id}
                    onClick={test_run}
                    className="bg-primary fg-on-primary px-6 py-2 rounded-full font-bold transition cursor-pointer flex items-center gap-2 disabled:bg-gray-500 disabled:text-gray-700 disabled:cursor-not-allowed"
                    title={some_no_id ? "Please assign Wikidata IDs to all stats before testing!" : ""}
                >
                    <Play className="w-4 h-4" />

                    Test run
                </button>

                <ToggleSwitch value={show_values} on_toggle={setShowValues} title="Disable to keep the puzzle a mystery while editing. Thanks Rihana for the suggestion!">
                    Show values
                </ToggleSwitch>
            </div>

            <div className="space-y-4 max-w-5xl">
                {puzzle.map((stat, idx) => (
                    <div key={stat.render_key} style={{ zIndex: 5 - idx }} className="relative flex items-stretch gap-2">
                        <div className="flex flex-col my-16 justify-between items-center">
                            {idx !== 0 ? (
                                <button
                                    onClick={() => {
                                        const newPuzzle = [...puzzle];
                                        [newPuzzle[idx - 1], newPuzzle[idx]] = [newPuzzle[idx], newPuzzle[idx - 1]];
                                        setPuzzle(newPuzzle);
                                    }}
                                    className="text-xs opacity-50 hover:opacity-100 transition cursor-pointer"
                                    title="Move up"
                                >
                                    <ArrowUp />
                                </button>
                            ) : (
                                <div />
                            )}

                            {idx !== puzzle.length - 1 ? (
                                <button
                                    onClick={() => {
                                        const newPuzzle = [...puzzle];
                                        [newPuzzle[idx], newPuzzle[idx + 1]] = [newPuzzle[idx + 1], newPuzzle[idx]];
                                        setPuzzle(newPuzzle);
                                    }}
                                    className="text-xs opacity-50 hover:opacity-100 transition cursor-pointer"
                                    title="Move down"
                                >
                                    <ArrowDown />
                                </button>
                            ) : (
                                <div />
                            )}
                        </div>

                        <EditableStat index={idx} stat={stat} updateStat={updateStat} show_values={show_values} />
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
