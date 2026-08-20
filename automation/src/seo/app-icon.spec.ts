import sharp from 'sharp';
import { renderAppIcon } from './app-icon';

const RED_SQUARE = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
    '<rect width="64" height="64" fill="#ff0000"/></svg>',
);

const TEAL = '#0f766e';

async function pixelAt(png: Buffer, x: number, y: number) {
  const { data } = await sharp(png)
    .extract({ left: x, top: y, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { r: data[0], g: data[1], b: data[2] };
}

describe('renderAppIcon', () => {
  it('rasterises the source at the requested size', async () => {
    const png = await renderAppIcon(RED_SQUARE, 192);
    const meta = await sharp(png).metadata();

    expect(meta.width).toBe(192);
    expect(meta.height).toBe(192);
    expect(meta.format).toBe('png');
  });

  it('fills the full canvas edge-to-edge when not maskable', async () => {
    const png = await renderAppIcon(RED_SQUARE, 64);

    expect(await pixelAt(png, 0, 0)).toEqual({ r: 255, g: 0, b: 0 });
    expect(await pixelAt(png, 32, 32)).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('shrinks the artwork into a safe zone and pads with the background colour when maskable', async () => {
    const png = await renderAppIcon(RED_SQUARE, 512, {
      maskable: true,
      background: TEAL,
    });
    const meta = await sharp(png).metadata();

    expect(meta.width).toBe(512);
    expect(await pixelAt(png, 0, 0)).toEqual({ r: 15, g: 118, b: 110 });
    expect(await pixelAt(png, 256, 256)).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('composites onto an opaque background even at full bleed, so corners are never transparent', async () => {
    const png = await renderAppIcon(RED_SQUARE, 180, { background: TEAL });

    expect(await pixelAt(png, 5, 5)).toEqual({ r: 255, g: 0, b: 0 });
  });
});
