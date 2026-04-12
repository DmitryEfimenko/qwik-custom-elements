import { Component, Event, EventEmitter, Prop, h } from '@stencil/core';

@Component({
  tag: 'de-button',
  styleUrl: 'de-button.scss',
  shadow: false,
})
export class DeButton {
  @Prop() size: 'sm' | 'md' | 'lg' = 'md';

  @Event() tripleClick!: EventEmitter<MouseEvent>;

  private clicks = 0;

  private handleClick(event: MouseEvent) {
    this.clicks += 1;

    if (this.clicks === 3) {
      console.log('StencilJS: tripleClick.emit');
      this.tripleClick.emit(event);
      this.clicks = 0;
    }
  }

  render() {
    return (
      <button
        class={`de-button de-button--${this.size}`}
        onClick={(event) => this.handleClick(event)}
      >
        <slot></slot>
      </button>
    );
  }
}
