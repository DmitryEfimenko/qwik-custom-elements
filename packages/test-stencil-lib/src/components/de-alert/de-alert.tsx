import { Component, Prop, h } from '@stencil/core';

/**
 * @slot - Default slot for alert body content.
 * @slot footer - Footer content area, rendered below the body with a top border.
 */
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
