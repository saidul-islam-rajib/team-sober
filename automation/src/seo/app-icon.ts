import sharp from 'sharp';

export const MASKABLE_SAFE_ZONE = 0.7;

export interface AppIconOptions {
  maskable?: boolean;
  background?: string;
}

export async function renderAppIcon(
  svg: Buffer,
  size: number,
  { maskable = false, background }: AppIconOptions = {},
): Promise<Buffer> {
  const glyphSize = maskable ? Math.round(size * MASKABLE_SAFE_ZONE) : size;
  const glyph = await sharp(svg).resize(glyphSize, glyphSize).png().toBuffer();

  if (!background) return glyph;

  return sharp({
    create: { width: size, height: size, channels: 4, background },
  })
    .composite([{ input: glyph, gravity: 'center' }])
    .png()
    .toBuffer();
}
