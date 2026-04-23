const EVENT_PROP_PREFIX = 'on';
const QRL_PRIVATE_PREFIX = '$';

function isEventLikeProp(propName: string) {
  return (
    propName.startsWith(EVENT_PROP_PREFIX) ||
    propName.startsWith(QRL_PRIVATE_PREFIX)
  );
}

export function updateStencilCSRHostProps(
  host: HTMLElement | undefined,
  props: Record<string, unknown> | undefined,
) {
  if (!host || !props) {
    return;
  }

  for (const [propName, propValue] of Object.entries(props)) {
    if (isEventLikeProp(propName)) {
      continue;
    }

    (host as unknown as Record<string, unknown>)[propName] = propValue;
  }
}
