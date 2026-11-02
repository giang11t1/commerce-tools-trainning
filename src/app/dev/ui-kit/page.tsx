import { notFound } from 'next/navigation';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import UiKit from './ui-kit';

export default async function UiKitPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const source = await readFile(join(process.cwd(), 'src/styles/design-tokens.css'), 'utf8');
  const tokens = Object.fromEntries(
    [...source.matchAll(/^\s*(--(?:ds-[\w-]+|breakpoint-[\w-]+)):\s*([^;]+);/gm)].map((match) => [match[1], match[2].trim()]),
  );

  return <UiKit tokens={tokens} />;
}
