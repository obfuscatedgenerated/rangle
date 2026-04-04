import {LoaderCircle} from "lucide-react";

export const LoadingSpinner = ({className = "", label = "Loading"}: {className?: string, label?: string}) => (
    <LoaderCircle className={`w-8 h-8 animate-spin text-muted ${className}`} aria-label={label} />
);
