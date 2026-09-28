const DATABASE_NAME = "app-ordini";
const STORE_NAME = "product-photos";

type StoredPhoto = { code: string; dataUrl: string };

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME))
        request.result.createObjectStore(STORE_NAME, { keyPath: "code" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function readAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function optimisePhoto(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Immagine non leggibile."));
      element.src = url;
    });
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("Impossibile preparare la foto."))),
        "image/jpeg",
        0.82,
      ),
    );
    return readAsDataUrl(blob);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function loadProductPhotos() {
  const database = await openDatabase();
  try {
    const entries = await new Promise<StoredPhoto[]>((resolve, reject) => {
      const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as StoredPhoto[]);
      request.onerror = () => reject(request.error);
    });
    return Object.fromEntries(entries.map((entry) => [entry.code, entry.dataUrl]));
  } finally {
    database.close();
  }
}

export async function saveProductPhoto(code: string, file: File) {
  const dataUrl = await optimisePhoto(file);
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put({ code, dataUrl } satisfies StoredPhoto);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    return dataUrl;
  } finally {
    database.close();
  }
}

export async function deleteProductPhoto(code: string) {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(code);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}
