"use client";

import {useAuth} from "@/context/AuthContext";

export const NewTabLink = ({onClick, ...props}: React.ComponentProps<"a">) => {
    const {via_discord_activity, open_external_link} = useAuth();

    // discord activity links need to be opened with the sdk, so we intercept clicks and use the sdk to open them instead
    const handle_click = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (via_discord_activity && open_external_link && props.href) {
            e.preventDefault();
            open_external_link(props.href);
        }

        if (onClick) {
            onClick(e);
        }
    }

    return <a {...props} onClick={handle_click} target="_blank" rel="noopener noreferrer" />;
}
