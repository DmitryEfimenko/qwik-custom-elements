import { component$, Slot } from '@builder.io/qwik';
import { GeneratedStencilComponent } from './runtime.generated';

export interface DeAlertProps {
  heading?: string;
  [key: string]: unknown;
}

export const DeAlert = component$<DeAlertProps>((props) => {
  const isEventBindingKey = (key: string) =>
    /^on[A-Z].*$$/.test(key) || key.includes(':');
  const eventProps: Record<string, unknown> = {};
  const elementProps: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
    if (key === 'children') {
      continue;
    }

    if (isEventBindingKey(key)) {
      eventProps[key] = value;
      continue;
    }

    elementProps[key] = value;
  }

  const mappedEvents = undefined;
  return (
    <GeneratedStencilComponent
      tagName="de-alert"
      props={elementProps}
      events={mappedEvents}
      slots={['footer']}
      {...eventProps}
    >
      <Slot />
      <Slot name="footer" />
    </GeneratedStencilComponent>
  );
});
