export function notImplemented(area: string): never {
  throw new Error(
    `Generator module not implemented yet: ${area}. Continue with the next plan item.`,
  );
}
