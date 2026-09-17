// frontend/src/eventBus.js
// A minimal pub/sub so unrelated components (e.g. the sidebar badge count
// and the Requests page) can tell each other "the underlying data changed,
// refetch" without lifting all state into one giant shared context.
const listeners = {};

export function subscribe(event, fn) {
  (listeners[event] ||= new Set()).add(fn);
  return () => listeners[event].delete(fn);
}

export function publish(event) {
  (listeners[event] || new Set()).forEach((fn) => fn());
}
