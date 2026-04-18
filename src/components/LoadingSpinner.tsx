import {LoaderCircle} from "lucide-react";

export const LoadingSpinner = ({className = "", label = "Loading", aria_hidden = false}: {className?: string, label?: string, aria_hidden?: "true" | "false" | boolean}) => (
    <LoaderCircle className={`w-8 h-8 animate-spin text-muted ${className}`} aria-label={label} aria-hidden={aria_hidden} />
);
