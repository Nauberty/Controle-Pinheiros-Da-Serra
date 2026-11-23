/**
 * Reduz a foto para no máximo 360px (lado maior) em JPEG, retornando como texto (data URL).
 * Fica com ~15–30 KB e é guardada dentro da própria ficha do membro (sem custo de armazenamento).
 */
export async function resizePhoto(file: File, max = 360, quality = 0.82): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('o arquivo não é uma imagem');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('não foi possível abrir a imagem'));
      i.src = url;
    });
    // recorte quadrado central (foto de perfil)
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    const size = Math.min(max, side);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
