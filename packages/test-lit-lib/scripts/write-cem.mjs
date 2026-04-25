import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const outputPath = path.join(packageRoot, 'custom-elements.json');

const manifest = {
  schemaVersion: '1.0.0',
  readme: '',
  modules: [
    {
      kind: 'javascript-module',
      path: 'src/components/de-alert.ts',
      declarations: [
        {
          kind: 'class',
          name: 'DeAlert',
          tagName: 'de-alert',
          attributes: [
            { name: 'heading', fieldName: 'heading', type: { text: 'string' } },
          ],
          members: [
            { kind: 'field', name: 'heading', type: { text: 'string' } },
          ],
          slots: [{ name: '' }, { name: 'footer' }],
        },
      ],
    },
    {
      kind: 'javascript-module',
      path: 'src/components/de-button.ts',
      declarations: [
        {
          kind: 'class',
          name: 'DeButton',
          tagName: 'de-button',
          attributes: [
            {
              name: 'size',
              fieldName: 'size',
              type: { text: "'sm' | 'md' | 'lg'" },
            },
          ],
          members: [
            {
              kind: 'field',
              name: 'size',
              type: { text: "'sm' | 'md' | 'lg'" },
            },
          ],
          events: [
            { name: 'tripleClick', type: { text: 'CustomEvent<MouseEvent>' } },
          ],
          slots: [{ name: '' }],
        },
      ],
    },
  ],
};

const output = `${JSON.stringify(manifest, null, 2)}\n`;
await writeFile(outputPath, output, 'utf8');
console.log(`wrote ${path.relative(packageRoot, outputPath)}`);
