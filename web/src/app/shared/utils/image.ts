/** Côté le plus long envoyé : l'API réduit encore à 1600 px. */
const MAX_SIDE = 2048;
/** En dessous de ce poids, la photo est envoyée telle quelle. */
const SMALL_BYTES = 1.5 * 1024 * 1024;

/**
 * Réduit une photo dans le navigateur avant l'envoi : une photo de téléphone de 5 à 10 Mo
 * devient un JPEG de quelques centaines de Ko, ce qui économise les données mobiles.
 * En cas d'échec (format non lu par le navigateur), le fichier d'origine est renvoyé.
 */
export async function downscale(file: Blob): Promise<Blob> {
  if (file.size <= SMALL_BYTES || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}
