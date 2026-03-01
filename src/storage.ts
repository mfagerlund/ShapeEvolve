import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadThumbnail(shapeId: string, dataURL: string): Promise<string> {
  const storageRef = ref(storage, `thumbnails/${shapeId}.png`);
  await uploadString(storageRef, dataURL, 'data_url');
  return getDownloadURL(storageRef);
}

export function captureThumbnail(canvas: HTMLCanvasElement): string {
  // Render to a square offscreen canvas so thumbnails have consistent 1:1 aspect
  const size = 512;
  const offscreen = document.createElement('canvas');
  offscreen.width = size;
  offscreen.height = size;
  const ctx = offscreen.getContext('2d')!;

  // Center-crop the source canvas into a square
  const src = canvas;
  const side = Math.min(src.width, src.height);
  const sx = (src.width - side) / 2;
  const sy = (src.height - side) / 2;
  ctx.drawImage(src, sx, sy, side, side, 0, 0, size, size);

  return offscreen.toDataURL('image/png');
}
