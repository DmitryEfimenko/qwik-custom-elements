import { component$, Slot } from '@builder.io/qwik';
import type { QRL } from '@builder.io/qwik';
import { GeneratedStencilComponent } from './runtime.generated';

export interface DeButtonProps {
  size?: "lg" | "md" | "sm";
  onTripleClick$?: QRL<(event: CustomEvent<MouseEvent>) => void>;
  [key: string]: unknown;
}

export const DeButton = component$<DeButtonProps>((props) => {
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

  const events: Record<string, QRL<(...args: any[]) => void>> = {};
  if (props.onTripleClick$) {
    events['tripleClick'] = props.onTripleClick$;
  }
  const mappedEvents = Object.keys(events).length > 0 ? events : undefined;
  return (
    <GeneratedStencilComponent
      tagName="de-button"
      props={elementProps}
      events={mappedEvents}
      slots={undefined}
      {...eventProps}
    >
      <Slot />
    </GeneratedStencilComponent>
  );
});
