import type { MetadataComponent } from '../types';

export interface EmittedWrapperFile {
  fileName: string;
  content: string;
}

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function getWrapperName(component: MetadataComponent): string {
  const normalized =
    component.componentName.trim() || toPascalCase(component.tagName);

  return normalized.replace(/Ssr$/i, '');
}

function isValidIdentifier(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);
}

function toEventPropName(eventName: string): string {
  return `on${toPascalCase(eventName)}$`;
}

function toEventType(detailType: string | undefined): string {
  const normalized = detailType?.trim();
  if (!normalized) {
    return 'CustomEvent<unknown>';
  }

  if (/^CustomEvent\s*</.test(normalized)) {
    return normalized;
  }

  return `CustomEvent<${normalized}>`;
}

function emitPropSignature(component: MetadataComponent): string {
  const lines = component.props.map((prop) => {
    const key = isValidIdentifier(prop.name) ? prop.name : `'${prop.name}'`;
    const optionalToken = prop.required ? '' : '?';
    const propType = prop.type.trim() || 'unknown';
    return `  ${key}${optionalToken}: ${propType};`;
  });

  const emittedEventProps = new Set<string>();
  for (const event of component.events) {
    const eventName = event.name.trim();
    if (eventName.length === 0) {
      continue;
    }

    const eventPropName = toEventPropName(eventName);
    if (emittedEventProps.has(eventPropName)) {
      continue;
    }

    emittedEventProps.add(eventPropName);
    lines.push(
      `  ${eventPropName}?: QRL<(event: ${toEventType(event.detailType)}) => void>;`,
    );
  }

  lines.push('  [key: string]: unknown;');
  return lines.join('\n');
}

function emitSlotRender(component: MetadataComponent): string {
  const slotLines: string[] = [];

  if (component.hasDefaultSlot) {
    slotLines.push('      <Slot />');
  }

  for (const slotName of component.namedSlots) {
    slotLines.push(`      <Slot name="${slotName}" />`);
  }

  return slotLines.join('\n');
}

function emitSlotList(component: MetadataComponent): string {
  if (component.namedSlots.length === 0) {
    return 'undefined';
  }

  const slots = component.namedSlots.map((slot) => `'${slot}'`).join(', ');
  return `[${slots}]`;
}

function emitEventsMapBlock(component: MetadataComponent): string {
  const emittedEventProps = new Set<string>();
  const assignments: string[] = [];

  for (const event of component.events) {
    const eventName = event.name.trim();
    if (eventName.length === 0) {
      continue;
    }

    const eventPropName = toEventPropName(eventName);
    if (emittedEventProps.has(eventPropName)) {
      continue;
    }

    emittedEventProps.add(eventPropName);
    assignments.push(`  if (props.${eventPropName}) {`);
    assignments.push(`    events['${eventName}'] = props.${eventPropName};`);
    assignments.push('  }');
  }

  if (assignments.length === 0) {
    return '  const mappedEvents = undefined;';
  }

  return `  const events: Record<string, QRL<(...args: any[]) => void>> = {};
${assignments.join('\n')}
  const mappedEvents = Object.keys(events).length > 0 ? events : undefined;`;
}

function emitWrapperSource(component: MetadataComponent): string {
  const wrapperName = getWrapperName(component);
  const propsTypeName = `${wrapperName}Props`;
  const slotRender = emitSlotRender(component);
  const slotList = emitSlotList(component);

  const needsSlotImport =
    component.hasDefaultSlot || component.namedSlots.length > 0;
  const hasEventMetadata = component.events.some(
    (event) => event.name.trim().length > 0,
  );

  const qwikValueImports = ['component$'];
  if (needsSlotImport) {
    qwikValueImports.push('Slot');
  }

  const qwikImports = [
    `import { ${qwikValueImports.join(', ')} } from '@builder.io/qwik';`,
  ];
  if (hasEventMetadata) {
    qwikImports.push("import type { QRL } from '@builder.io/qwik';");
  }

  const childrenBlock = slotRender.length > 0 ? `\n${slotRender}\n` : '';

  const splitPropsBlock = `  const isEventBindingKey = (key: string) =>
    /^on[A-Z].*\$$/.test(key) || key.includes(':');
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
`;

  return `${qwikImports.join('\n')}
import { GeneratedStencilComponent } from './runtime.generated';

export interface ${propsTypeName} {
${emitPropSignature(component)}
}

export const ${wrapperName} = component$<${propsTypeName}>((props) => {
${splitPropsBlock}
${emitEventsMapBlock(component)}
  return (
    <GeneratedStencilComponent
      tagName="${component.tagName}"
      props={elementProps}
      events={mappedEvents}
      slots={${slotList}}
      {...eventProps}
    >${childrenBlock}    </GeneratedStencilComponent>
  );
});
`;
}

export function emitComponentWrapper(
  component: MetadataComponent,
): EmittedWrapperFile {
  const wrapperName = getWrapperName(component);

  return {
    fileName: `${wrapperName}.tsx`,
    content: emitWrapperSource(component),
  };
}
