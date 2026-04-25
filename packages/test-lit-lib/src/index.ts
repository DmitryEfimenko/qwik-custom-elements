import { DeAlert } from './components/de-alert.js';
import { DeButton } from './components/de-button.js';

if (!customElements.get('de-button')) {
  customElements.define('de-button', DeButton);
}

if (!customElements.get('de-alert')) {
  customElements.define('de-alert', DeAlert);
}

export { DeAlert, DeButton };
