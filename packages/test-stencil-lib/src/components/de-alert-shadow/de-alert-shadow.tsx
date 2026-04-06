import { Component, Prop, h } from '@stencil/core';


@Component({
  tag: 'de-alert-shadow',
  styleUrl: 'de-alert-shadow.scss',
  shadow: true,
})
export class DeAlertShadow {
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
