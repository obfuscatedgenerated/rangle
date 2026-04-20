import type {DiscordSDK} from "@discord/embedded-app-sdk";

// TODO: move to next public env
export const ACTIVITY_CLIENT_ID = "1495567479978725476";

let loaded_sdk: DiscordSDK | null = null;

export const get_discord_sdk = async () => {
    if (!loaded_sdk) {
        const {DiscordSDK} = await import("@discord/embedded-app-sdk");

        loaded_sdk = new DiscordSDK(ACTIVITY_CLIENT_ID);
        await loaded_sdk.ready();
    }
    return loaded_sdk;
};

// TODO: could use discordsays origin check?
export const in_discord_activity = () => {
    if (typeof window === "undefined") {
        return false;
    }

    // could use sessionStorage but the activity is always its own context anyway so may as well cache it for next time!
    if (localStorage.getItem("in_discord") === "true") {
        return true;
    }

    return window.location.search.includes("instance_id=");
};
