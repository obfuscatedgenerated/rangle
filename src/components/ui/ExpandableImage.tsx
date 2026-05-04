"use client";

import {useState} from "react";
import {Scrim} from "@/components/ui/Scrim";

const ExpandedImageOverlay = ({image_props, expanded, setExpanded}: {image_props: React.ComponentProps<"img">, expanded: boolean, setExpanded: (expanded: boolean) => void}) => (
    <div
        className={`cursor-pointer flex items-center justify-center fixed h-screen w-screen top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${expanded ? "opacity-100" : "opacity-0 pointer-events-none"} transition-opacity duration-300 z-50`}
        onClick={() => setExpanded(false)}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        title="Click to close"
    >
        <Scrim />
        <img
            {...image_props}
            className="z-9999 absolute max-h-screen max-w-screen object-contain py-[5vh] px-[5vw]"
        />
    </div>
);

export const ExpandableImage = (props: React.ComponentProps<"img">) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <>
            <img
                {...props}
                className={`${props.className} cursor-pointer transition-all duration-300 object-contain`}
                onClick={() => setExpanded(!expanded)}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            />

            <ExpandedImageOverlay image_props={props} expanded={expanded} setExpanded={setExpanded} />
        </>
    );
}