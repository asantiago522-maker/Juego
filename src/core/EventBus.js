/** Pub/sub global: desacopla la lógica de carrera de la UI. */
export class EventBus {
  constructor() {
    this.map = new Map();
  }

  /** Suscribe `fn` a `evt`. Devuelve una función de desuscripción. */
  on(evt, fn) {
    let set = this.map.get(evt);
    if (!set) {
      set = new Set();
      this.map.set(evt, set);
    }
    set.add(fn);
    return () => this.off(evt, fn);
  }

  off(evt, fn) {
    this.map.get(evt)?.delete(fn);
  }

  emit(evt, data) {
    const set = this.map.get(evt);
    if (!set) return;
    for (const fn of [...set]) fn(data);
  }

  clear() {
    this.map.clear();
  }
}
