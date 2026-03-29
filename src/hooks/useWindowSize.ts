import {useEffect, useState} from "react";

export const useWindowSize = () => {
    const [window_size, setWindowSize] = useState({
        width: typeof window !== "undefined" ? window.innerWidth : 0,
        height: typeof window !== "undefined" ? window.innerHeight : 0,
    });

    useEffect(() => {
        const on_resize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener("resize", on_resize);

        return () => {
            window.removeEventListener("resize", on_resize);
        };
    }, []);

    return window_size;
}
