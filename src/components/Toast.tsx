"use client";

interface ToastProps {
    message: string;
    visible: boolean;
    position: "top" | "bottom" | "center";
    className?: string;
}

export const Toast = ({ message, visible, position, className = "" }: ToastProps) => (
    <div
        className={`fixed ${position === "top" ? "top-4" : position === "bottom" ? "bottom-4" : "top-1/2 -translate-y-1/2"} left-1/2 transform -translate-x-1/2 text-lg sm:text-xl shadow-xl bg-toast text-on-toast px-4 py-2 rounded transition-opacity duration-300 ${
            visible ? "opacity-100" : "opacity-0 pointer-events-none"
        } ${className}`}
    >
        {message}
    </div>
);
