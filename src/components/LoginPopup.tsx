import {useAuth} from "@/context/AuthContext";
import {useEffect, useRef, useState} from "react";
import {HeightListeningIFrame} from "@/components/HeightListeningIFrame";
import {NewTabLink} from "@/components/NewTabLink";

interface LoginPopupProps {
    open: boolean;
    on_close: () => void;
}

export const LoginPopup = ({open, on_close}: LoginPopupProps) => {
    const dialog_ref = useRef<HTMLDialogElement>(null);
    const {login_url} = useAuth();

    useEffect(() => {
        if (open) {
            dialog_ref.current?.showModal();
        } else {
            dialog_ref.current?.close();
        }
    }, [open]);

    return (
        <dialog onAbort={on_close} ref={dialog_ref} className="rounded-lg p-4 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[95vw] sm:max-w-md w-full bg-background-variant text-foreground-variant flex flex-col items-center">
            <h2 className="text-xl font-bold mb-2">Log in</h2>

            <HeightListeningIFrame className="w-full max-h-100 rounded-lg transition-[height] duration-200 ease-out" src={login_url}></HeightListeningIFrame>

            <p className="my-4 text-pretty text-center">By logging in, you agree to the <NewTabLink href="https://rangle.today/privacy" className="underline">Privacy Policy</NewTabLink>.</p>

            <button
                className="mt-2 px-4 py-2 bg-secondary text-on-secondary rounded cursor-pointer"
                onClick={on_close}
            >
                Cancel
            </button>
        </dialog>
    );
}
