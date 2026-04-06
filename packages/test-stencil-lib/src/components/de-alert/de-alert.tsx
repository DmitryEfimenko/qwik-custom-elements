import { Component, Prop, h } from '@stencil/core';


@Component({
  tag: 'de-alert',
  styleUrl: 'de-alert.scss',
  shadow: false,
})
export class DeAlert {
  @Prop() heading: string = 'Alert';

  render() {
    return (
      <div class="de-alert">
        <strong>{this.heading}</strong>
        
        <div class="de-alert__content">
          <slot></slot>
        </div>

        <div class="de-alert__footer">
          <slot name="footer"></slot>
        </div>
      </div>
    );
  }
}
