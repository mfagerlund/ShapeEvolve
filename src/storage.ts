import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadThumbnail(shapeId: string, dataURL: string): Promise<string> {
  const storageRef = ref(storage, `thumbnails/${shapeId}.png`);
  await uploadString(storageRef, dataURL, 'data_url');
  return getDownloadURL(storageRef);
}

export function captureThumbnail(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}
