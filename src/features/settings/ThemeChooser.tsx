"use client";

import {useSettingValue} from "@/context/SettingsContext";
import {THEMES} from "@/themes";

import {useRangleScores} from "@/context/RangleScoresContext";
import {useMemo} from "react";
import {LoadingSpinner} from "@/components/ui/LoadingSpinner";
import {ChevronDown} from "lucide-react";

export const ThemeChooser = () => {
    const {scores, stats} = useRangleScores();
    const [theme_id, setThemeId] = useSettingValue("theme");

    // secret options arent shown unless criteria is met
    // otherwise, all non-secret themes are shown and non-criteria themes are shown as disabled

    const themes_with_met_criteria = useMemo(
        () => {
            if (!scores || !stats) {
                return [];
            }

            return Object.keys(THEMES).filter((id) => {
                const theme = THEMES[id as keyof typeof THEMES];

                if (theme.criteria === undefined) {
                    return true;
                }

                return theme.criteria({scores, stats});
            });
        },
        [scores, stats]
    );

    const visible_themes = useMemo(
        () => {
            if (!scores || !stats) {
                return Object.keys(THEMES).filter((id) => !THEMES[id as keyof typeof THEMES].secret);
            }

            return Object.keys(THEMES).filter((id) => {
                const theme = THEMES[id as keyof typeof THEMES];
                return !theme.secret || theme.criteria === undefined || theme.criteria({scores, stats});
            });
        },
        [scores, stats]
    );

    const selected_theme_name = useMemo(
        () => {
            const theme = THEMES[theme_id as keyof typeof THEMES];
            if (!theme) {
                return "Unknown Theme";
            }

            return theme.name;
        },
        [theme_id]
    );

    if (!scores) {
        return <LoadingSpinner />;
    }

    return (
        <div className="relative w-full max-w-xs group">
            <div className="flex items-center justify-between p-2 rounded bg-tertiary-background border border-foreground-variant/10 group-focus-within:ring-2 group-focus-within:ring-primary pointer-events-none">
                <span className="truncate">{selected_theme_name}</span>
                <ChevronDown className="w-4 h-4 opacity-50" />
            </div>

            <select
                value={theme_id}
                onChange={(e) => setThemeId(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full appearance-none text-foreground bg-tertiary-background rounded border border-foreground-variant/10 focus:ring-2 focus:ring-primary p-2"
            >
                {visible_themes.map((id) => {
                    const theme = THEMES[id as keyof typeof THEMES];
                    const met_criteria = themes_with_met_criteria.includes(id);

                    return (
                        <option key={id} value={id} disabled={!met_criteria}>
                            {theme.name}{theme.criteria !== undefined && ` (${met_criteria ? "unlocked for " : "requires "} ${theme.criteria_description || "unknown criteria"})`}
                        </option>
                    );
                })}
            </select>
        </div>
    );
}
