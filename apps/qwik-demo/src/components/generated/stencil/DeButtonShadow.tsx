import { component$, Slot } from '@builder.io/qwik';
import { GeneratedStencilComponent } from './runtime.generated';

export interface DeButtonShadowProps {
  size?: "lg" | "md" | "sm";
  [key: string]: unknown;
}

export const DeButtonShadow = component$<DeButtonShadowProps>((props) => {
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
      tagName="de-button-shadow"
      props={elementProps}
      events={mappedEvents}
      slots={undefined}
      {...eventProps}
    >
      <Slot />
    </GeneratedStencilComponent>
  );
});
