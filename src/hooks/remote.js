import Phaser from "phaser";
import { setValues } from "./func";

// Used to emit events between components, HTML and Phaser scenes
export const RemoteEvent = new Phaser.Events.EventEmitter();
const GameEvent = {
    onEvents(events) {
        setValues(events, ({ key, value }) => {
            RemoteEvent.on(key, value);
        });
    },
    offEvents(events) {
        setValues(events, ({ key, value }) => {
            RemoteEvent.off(key, value);
        });
    },
    emitEvents(events) {
        setValues(events, ({ key, value }) => {
            RemoteEvent.emit(key, value);
        });
    },
    emitEvent(event, arg = null) {
        RemoteEvent.emit(event, arg);
    },
    onEvent(event, callback = Function) {
        RemoteEvent.on(event, callback);
    },
    offEvent(event, callback = Function) {
        RemoteEvent.off(event, callback);
    },
    onceEvent(event, callback = Function) {
        RemoteEvent.once(event, callback);
    },
};

export const {
    onEvents,
    offEvents,
    emitEvents,
    emitEvent,
    onEvent,
    offEvent,
    onceEvent,
} = GameEvent;
