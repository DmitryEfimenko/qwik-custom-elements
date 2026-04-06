import { parseCliArgs } from './cli';
import { loadGeneratorConfig } from './config';
import { runGeneratorWithOverrides } from './generator';

async function main(): Promise<void> {
  const cliOverrides = parseCliArgs(process.argv.slice(2));
  const config = loadGeneratorConfig(cliOverrides.configPath);

  await runGeneratorWithOverrides(config, cliOverrides);
}

void main();
