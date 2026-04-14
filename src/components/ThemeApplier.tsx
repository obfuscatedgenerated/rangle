"use client";

import {useSettingValue} from "@/context/SettingsContext";
import {useCallback, useEffect, useMemo} from "react";
import {THEMES} from "@/themes";

export const ThemeApplier = () => {
    const [theme_id] = useSettingValue("theme");

    const theme_data = useMemo(
        () => THEMES[theme_id] || THEMES["default"],
        [theme_id]
    );

    const update_icon = useCallback(
        () => {
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
            link_element.dataset["applier"] = "true";

            // mess with the rel to force the browser to update the favicon, since some browsers aggressively cache it
            link_element.rel = "shortcut icon";
            setTimeout(() => {
                if (link_element) {
                    link_element.rel = "icon";
                }
            }, 50);
        },
        [theme_data.icon]
    );

    useEffect(() => {
        update_icon();

        const update_if_not_theme_applier = (mutations: MutationRecord[]) => {
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    for (const node of mutation.addedNodes) {
                        if (node instanceof HTMLLinkElement && node.rel === "icon" && node.href.endsWith(".svg") && !node.dataset["applier"]) {
                            update_icon();
                            return;
                        }
                    }
                }
            }
        }

        // look for nextjs "helpfully" trying to add the icon back in client code
        const observer = new MutationObserver(update_if_not_theme_applier);
        observer.observe(document.head, { childList: true });

        return () => {
            observer.disconnect();
        };
    }, [theme_data.icon, update_icon]);

    // this icon logic is a giant bodge! but i don't want to take the seo risk of removing the default icon svg from the static metadata
    // its annoying that nextjs thinks it knows better!
    // maybe could expose just a favicon then make the svg icon purely programmatic but i don't like that

    return <div className={theme_data.css_class} />;
}
