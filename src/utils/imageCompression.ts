const DEFAULT_MAX_PHOTO_BYTES = 195 * 1024; // <= 200KB limit for safe Supabase storage

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Erro ao ler imagem selecionada.'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao decodificar imagem.'));
    img.src = src;
  });
}

/**
 * Comprime qualquer imagem (File ou base64 data URL) para no máximo 200KB.
 * Se já for uma URL pública (http/https) ou já estiver abaixo do limite, retorna sem reprocessar.
 */
export async function compressImageToMax200KB(
  input: File | string,
  maxBytes: number = DEFAULT_MAX_PHOTO_BYTES
): Promise<string> {
  if (!input) return '';

  let rawDataUrl = '';
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return '';
    if (!trimmed.startsWith('data:image')) {
      return trimmed;
    }
    if (trimmed.length <= maxBytes) {
      return trimmed;
    }
    rawDataUrl = trimmed;
  } else {
    rawDataUrl = await readFileAsDataUrl(input);
    if (!rawDataUrl || !rawDataUrl.startsWith('data:image')) {
      return rawDataUrl;
    }
    if (rawDataUrl.length <= maxBytes) {
      return rawDataUrl;
    }
  }

  try {
    const img = await loadImageElement(rawDataUrl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return rawDataUrl;

    const maxDims = [640, 480, 360, 280, 200];
    const qualities = [0.78, 0.62, 0.48, 0.35, 0.25];
    let bestDataUrl = rawDataUrl;

    for (const maxDim of maxDims) {
      let width = img.naturalWidth || img.width || maxDim;
      let height = img.naturalHeight || img.height || maxDim;

      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.max(1, Math.round((height * maxDim) / width));
          width = maxDim;
        } else {
          width = Math.max(1, Math.round((width * maxDim) / height));
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      for (const quality of qualities) {
        const compressed = canvas.toDataURL('image/jpeg', quality);
        bestDataUrl = compressed;
        if (compressed.length <= maxBytes) {
          return compressed;
        }
      }
    }

    return bestDataUrl;
  } catch {
    return rawDataUrl;
  }
}
