import { Component, Prop, h } from '@stencil/core';


@Component({
  tag: 'de-button-shadow',
  styleUrl: 'de-button-shadow.scss',
  shadow: true,
})
export class DeButtonShadow {
  @Prop() size: 'sm' | 'md' | 'lg' = 'md';

  render() {
    return (<button class={`de-button de-button--${this.size}`}>
      <slot></slot>
    </button>
    );
  }
}
