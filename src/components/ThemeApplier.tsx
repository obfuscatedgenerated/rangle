"use client";

import {useSettingValue} from "@/context/SettingsContext";
import {useMemo} from "react";
import {THEMES} from "@/themes";

export const ThemeApplier = () => {
    const [theme_id] = useSettingValue("theme");

    const theme_data = useMemo(
        () => THEMES[theme_id] || THEMES["default"],
        [theme_id]
    );

    return <div className={theme_data.css_class} />;
}
