import { writable } from 'svelte/store';

function createCount() {
  const { subscribe, set, update } = writable(1);

  return {
    subscribe,
    increment: () => update(n => n < 30 ? n + 1 : n),
    decrement: () => update(n => n !== 1 ? n - 1 : 1),
  };
}

export const count = createCount();
