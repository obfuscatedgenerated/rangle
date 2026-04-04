import type { ScoreState } from "@/context/RangleScoresContext";

export interface ThemeDefinition {
    css_class: string;
    name: string;
    criteria: (scores: ScoreState) => boolean;
    criteria_description?: string;
    secret?: boolean;
}

export const THEMES: ThemeDefinition[] = [
    {
        name: "Classic",
        css_class: "",
        criteria: () => true,
    },
    {
        name: "Foolish",
        css_class: "theme-fools",
        criteria_description: "winning the April Fools 2026 Rangle",
        criteria: (scores) => {
            return scores["2026-04-01"].result === true;
        },
        secret: true
    }
];
