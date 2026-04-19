import {useEffect, useRef, useState} from "react";

export const HeightListeningIFrame = ({src, className = "", default_height = 300}: {src?: string, className?: string, default_height?: number}) => {
    const iframe_ref = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState(default_height);

    useEffect(() => {
        const handle_message = (event: MessageEvent) => {
            if (event.source !== iframe_ref.current?.contentWindow) {
                return;
            }

            if (typeof event.data === "object" && event.data.type === "iframe-resize") {
                setHeight(event.data.height);
            }
        }

        window.addEventListener("message", handle_message);

        return () => {
            window.removeEventListener("message", handle_message);
        }
    }, []);

    return (
        <iframe ref={iframe_ref} src={src} className={className} style={{height}}></iframe>
    );
}
