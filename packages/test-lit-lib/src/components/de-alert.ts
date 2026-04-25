import { css, html, LitElement } from 'lit';

export class DeAlert extends LitElement {
  static properties = {
    heading: { type: String },
  };

  static styles = css`
    :host {
      display: block;
    }

    .de-alert {
      border: 1px solid #cc9a00;
      border-radius: 4px;
      padding: 0.75rem;
    }

    .de-alert__content {
      margin-top: 0.5rem;
    }

    .de-alert__footer {
      border-top: 1px solid #f0d58a;
      margin-top: 0.75rem;
      padding-top: 0.5rem;
    }
  `;

  heading = 'Alert';

  render() {
    return html`
      <div class="de-alert">
        <strong>${this.heading}</strong>
        <div class="de-alert__content">
          <slot></slot>
        </div>
        <div class="de-alert__footer">
          <slot name="footer"></slot>
        </div>
      </div>
    `;
  }
}
