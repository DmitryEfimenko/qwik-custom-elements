import { defineCustomElement as defineAlert } from '../dist/components/de-alert.js';
import { defineCustomElement as defineAlertShadow } from '../dist/components/de-alert-shadow.js';
import { defineCustomElement as defineButton } from '../dist/components/de-button.js';
import { defineCustomElement as defineButtonShadow } from '../dist/components/de-button-shadow.js';

export async function defineCustomElements() {
  defineAlert();
  defineAlertShadow();
  defineButton();
  defineButtonShadow();
}

export async function applyPolyfills() {
  return;
}

export function setNonce() {
  return;
}
