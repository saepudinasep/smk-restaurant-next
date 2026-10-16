import arcjet, { detectBot } from '@arcjet/next';

let arcjetInstance: ReturnType<typeof createArcjet> | undefined;

function createArcjet(key: string) {
  return arcjet({
    key,
    rules: [
      detectBot({
        mode: 'LIVE',
        allow: [],
      }),
    ],
  });
}

export function getArcjet() {
  const key = process.env.ARCJET_KEY;
  if (!key) {
    throw new Error('ARCJET_KEY belum dikonfigurasi. Tambahkan API key Arcjet ke environment.');
  }

  arcjetInstance ??= createArcjet(key);
  return arcjetInstance;
}
