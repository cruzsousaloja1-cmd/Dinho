const DEFAULT_MAX_PHOTO_BYTES = 195 * 1024; // <= 200KB limit for safe compression before upload
export const MAX_PHOTO_FILE_BYTES = 2 * 1024 * 1024; // 2MB hard limit on selected photo

export function validatePhotoMax2MB(file: File | null | undefined): string | null {
  if (!file) return 'Nenhuma imagem selecionada.';
  if (file.type && !file.type.startsWith('image/')) {
    return 'Selecione um arquivo de imagem válido (JPG, PNG ou WEBP).';
  }
  if (file.size > MAX_PHOTO_FILE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1).replace('.', ',');
    return `A foto selecionada tem ${sizeMb}MB e excede o limite de 2MB. Escolha uma imagem menor.`;
  }
  return null;
}

export function dataUrlToJpegBlob(dataUrl: string): Blob | null {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:')) return null;
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const header = parts[0];
    const base64 = parts[1];
    const mimeMatch = header.match(/data:([^;]+);base64/i);
    const mime = mimeMatch?.[1] || 'image/jpeg';
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

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
    const sizeErr = validatePhotoMax2MB(input);
    if (sizeErr) {
      throw new Error(sizeErr);
    }
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

export async function validateAndCompressPhotoFile(
  file: File,
  maxBytes: number = DEFAULT_MAX_PHOTO_BYTES
): Promise<{ dataUrl: string; blob: Blob | null }> {
  const err = validatePhotoMax2MB(file);
  if (err) {
    throw new Error(err);
  }
  const dataUrl = await compressImageToMax200KB(file, maxBytes);
  if (!dataUrl || !dataUrl.startsWith('data:image')) {
    throw new Error('Não foi possível processar a foto selecionada.');
  }
  return {
    dataUrl,
    blob: dataUrlToJpegBlob(dataUrl),
  };
}

