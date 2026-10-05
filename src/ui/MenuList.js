import { el } from './dom.js';

/**
 * Lista de opciones navegable con teclado y mando.
 * items: [{ id, label, sub?, danger?, disabled? }]
 */
export class MenuList {
  constructor(container, items, game, { onSelect, onActivate } = {}) {
    this.game = game;
    this.items = items;
    this.index = 0;
    this.onSelect = onSelect;
    this.onActivate = onActivate;
    this.root = el('div', 'menu');
    container.appendChild(this.root);
    this._build();
  }

  _build() {
    this.root.innerHTML = '';
    this.rows = this.items.map((item, i) => {
      const row = el('div', 'menu-item' + (item.danger ? ' danger' : ''));
      row.innerHTML = `<span class="arrow">›</span><span class="label">${item.label}</span>${
        item.sub ? `<span class="sub">${item.sub}</span>` : ''
      }`;
      row.addEventListener('mouseenter', () => {
        if (this.index !== i) {
          this.index = i;
          this.refresh();
        }
      });
      row.addEventListener('click', () => {
        this.index = i;
        this.refresh();
        this._activate();
      });
      this.root.appendChild(row);
      return row;
    });
    this.refresh();
  }

  setItems(items) {
    this.items = items;
    this.index = Math.min(this.index, items.length - 1);
    this._build();
  }

  refresh() {
    this.rows.forEach((r, i) => r.classList.toggle('selected', i === this.index));
  }

  get selected() {
    return this.items[this.index];
  }

  _activate() {
    const item = this.items[this.index];
    if (!item || item.disabled) return;
    this.game.audio.uiOk();
    if (this.onActivate) this.onActivate(item);
  }

  update(input, dt) {
    const d =
      input.navRepeat('down', dt) + input.navRepeat('right', dt) -
      input.navRepeat('up', dt) - input.navRepeat('left', dt);
    if (d !== 0) {
      const n = this.items.length;
      this.index = (((this.index + d) % n) + n) % n;
      this.game.audio.uiMove();
      this.refresh();
      if (this.onSelect) this.onSelect(this.items[this.index], this.index);
    }
    if (input.pressed('ok')) this._activate();
  }
}
