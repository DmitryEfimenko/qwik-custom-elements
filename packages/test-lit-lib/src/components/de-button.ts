import { css, html, LitElement } from 'lit';

const sizeValues = new Set(['sm', 'md', 'lg']);

export class DeButton extends LitElement {
  static properties = {
    size: { type: String, reflect: true },
  };

  static styles = css`
    :host {
      display: inline-block;
    }

    button {
      border: 1px solid #2e2e2e;
      border-radius: 4px;
      cursor: pointer;
      font: inherit;
      padding: 0.35rem 0.8rem;
    }

    button[data-size='sm'] {
      font-size: 0.8rem;
      padding: 0.2rem 0.55rem;
    }

    button[data-size='md'] {
      font-size: 0.95rem;
      padding: 0.35rem 0.8rem;
    }

    button[data-size='lg'] {
      font-size: 1.1rem;
      padding: 0.5rem 1rem;
    }
  `;

  size: 'sm' | 'md' | 'lg' = 'md';
  #clicks = 0;

  protected willUpdate(): void {
    if (!sizeValues.has(this.size)) {
      this.size = 'md';
    }
  }

  #handleClick(event: MouseEvent): void {
    this.#clicks += 1;

    if (this.#clicks === 3) {
      this.dispatchEvent(
        new CustomEvent<MouseEvent>('tripleClick', {
          detail: event,
          bubbles: true,
          composed: true,
        }),
      );
      this.#clicks = 0;
    }
  }

  render() {
    return html`
      <button
        data-size=${this.size}
        @click=${(event: MouseEvent) => this.#handleClick(event)}
      >
        <slot></slot>
      </button>
    `;
  }
}
