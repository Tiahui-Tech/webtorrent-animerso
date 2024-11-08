const EventEmitter = require('events');

const GLOBAL_EVENT = '__GLOBAL_EVENT__';

class EventBusWrapper {
    constructor() {
        this._emitter = new EventEmitter();
        this._handlers = new Map();
    }

    on(event, handler) {
        if (!this._handlers.has(event)) {
            this._handlers.set(event, new Set());
        }
        this._handlers.get(event).add(handler);

        this._emitter.on(GLOBAL_EVENT, (eventName, ...args) => {
            if (eventName === event) {
                handler(...args);
            }
        });
        
        return this;
    }

    emit(event, ...args) {
        this._emitter.emit(GLOBAL_EVENT, event, ...args);
        return this;
    }

    off(event, handler) {
        const handlers = this._handlers.get(event);
        if (handlers) {
            handlers.delete(handler);
        }
        return this;
    }
}

const eventBus = new EventBusWrapper();
module.exports = eventBus;