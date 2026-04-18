import { EventEmitter } from "events";
export const cloud_bus = new EventEmitter();

export const CLOUD_SYNC_EVENTS = {
    RELOAD_LOCAL_STATE: "RELOAD_LOCAL_STATE",
};

// TODO: time to learn zustand?
