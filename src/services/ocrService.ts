import { createWorker } from 'tesseract.js';

export interface OcrProgress {
  progress: number;
  status: string;
}

/**
 * Extracts raw text from an image (base64 data URL, blob, or file)
 * entirely in the client-side browser using Tesseract.js Web Worker.
 * Zero server cost, zero external API required.
 */
export async function extractTextWithOcr(
  imageSource: string,
  onProgress?: (info: OcrProgress) => void
): Promise<string> {
  let worker: Tesseract.Worker | null = null;

  try {
    onProgress?.({ progress: 5, status: 'Inițializare scaner OCR...' });

    // Initialize worker with Romanian and English language dictionaries
    try {
      worker = await createWorker(['ron', 'eng'], undefined, {
        logger: (m) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            onProgress?.({
              progress: Math.min(95, Math.round(m.progress * 100)),
              status: `Scanare text din imagine... (${Math.round(m.progress * 100)}%)`,
            });
          } else if (m.status === 'loading tesseract core' || m.status === 'initializing api') {
            onProgress?.({ progress: 15, status: 'Pregătire motor recunoaștere caractere...' });
          } else if (m.status === 'loading language traineddata') {
            onProgress?.({ progress: 25, status: 'Descărcare dicționar română...' });
          }
        },
      });
    } catch (langErr) {
      console.warn('Could not load ron+eng languages, falling back to eng only:', langErr);
      worker = await createWorker('eng', undefined, {
        logger: (m) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            onProgress?.({
              progress: Math.min(95, Math.round(m.progress * 100)),
              status: `Scanare text... (${Math.round(m.progress * 100)}%)`,
            });
          }
        },
      });
    }

    onProgress?.({ progress: 30, status: 'Analiză vizuală imagine...' });
    const result = await worker.recognize(imageSource);
    onProgress?.({ progress: 100, status: 'Text extras cu succes!' });

    const text = (result?.data?.text || '').trim();
    return text;
  } catch (err: any) {
    console.error('OCR Error:', err);
    throw new Error(`Eroare la scanarea optică a imaginii: ${err?.message || 'Nu s-a putut citi imaginea.'}`);
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (termErr) {
        console.warn('Worker termination issue:', termErr);
      }
    }
  }
}
