const EventEmitter = require('events');
const eLog = require('electron-log');

const GLOBAL_EVENT = '__GLOBAL_EVENT__';

class EventBusWrapper {
    constructor() {
        this._emitter = new EventEmitter();
        this._emitter.setMaxListeners(50);
        this._handlers = new Map();
        this._blacklistedEvents = new Set([
            'stateUpdate',
            'subtitlesUpdate',
            'jumpToTime'
        ]);
    }

    _shouldLog(event) {
        return !this._blacklistedEvents.has(event);
    }

    on(event, handler) {
        if (!this._handlers.has(event)) {
            this._handlers.set(event, new Set());
        }
        this._handlers.get(event).add(handler);

        this._emitter.on(GLOBAL_EVENT, (eventName, ...args) => {
            if (eventName === event) {
                if (this._shouldLog(event)) {
                    eLog.debug(`EventBus: On "${event}":`, ...args);
                }
                handler(...args);
            }
        });
        
        return this;
    }

    emit(event, ...args) {
        if (this._shouldLog(event)) {
            eLog.info(`EventBus: Received "${event}"`, ...args);
            console.log(`EventBus: Received "${event}"`, ...args);
        }
        
        this._emitter.emit(GLOBAL_EVENT, event, ...args);
        return this;
    }

    off(event, handler) {
        if (this._shouldLog(event)) {
            eLog.info(`EventBus: Off "${event}"`);
        }
        
        const handlers = this._handlers.get(event);
        if (handlers) {
            handlers.delete(handler);
        }
        return this;
    }
}

const eventBus = new EventBusWrapper();
module.exports = eventBus;