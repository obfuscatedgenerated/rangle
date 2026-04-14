"use client";

import {useSettingValue} from "@/context/SettingsContext";
import {useEffect, useMemo} from "react";
import {THEMES} from "@/themes";

export const ThemeApplier = () => {
    const [theme_id] = useSettingValue("theme");

    const theme_data = useMemo(
        () => THEMES[theme_id] || THEMES["default"],
        [theme_id]
    );

    useEffect(() => {
        // apply the theme's favicon (or fallback to default if not defined)
        const icon_path = theme_data.icon || "/icon.svg";

        // find the rel icon link element with an svg href to replace
        // if multiple exist, choose the first and delete the rest
        const link_elements = document.querySelectorAll('link[rel="icon"][href$=".svg"]') as NodeListOf<HTMLLinkElement> | null;
        let link_element: HTMLLinkElement | null = null;

        if (link_elements) {
            for (const el of link_elements) {
                if (!link_element) {
                    link_element = el;
                } else {
                    el.remove();
                }
            }
        }

        // if not found, create a new link element
        if (!link_element) {
            link_element = document.createElement("link");
            link_element.rel = "icon";
            document.head.appendChild(link_element);
        }

        link_element.href = icon_path;
    }, [theme_data.icon]);

    return <div className={theme_data.css_class} />;
}
