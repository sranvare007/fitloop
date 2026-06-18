/**
 * Filesystem storage for physique progress photos.
 *
 * Captured photos are copied out of the camera cache into a persistent
 * `physique/` directory inside the app document directory. Only the filename
 * is stored in SQLite — absolute uris are resolved at load time because the
 * document directory's absolute path can change between installs/OS updates.
 */
import { Directory, File, Paths } from 'expo-file-system';

const DIR_NAME = 'physique';

function dir(): Directory {
  return new Directory(Paths.document, DIR_NAME);
}

function ensureDir(): Directory {
  const d = dir();
  if (!d.exists) d.create({ intermediates: true });
  return d;
}

/** Copy a captured photo into the document dir. Returns the stored filename. */
export function persistPhoto(sourceUri: string, id: string): string {
  const d = ensureDir();
  const ext = (sourceUri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
  const filename = `${id}.${ext}`;
  const dest = new File(d, filename);
  if (dest.exists) dest.delete();
  new File(sourceUri).copy(dest);
  return filename;
}

/** Resolve a stored filename to an absolute file:// uri. */
export function photoUri(filename: string): string {
  return new File(dir(), filename).uri;
}

/** Delete a stored photo file (best-effort — a missing file is not an error). */
export function deletePhotoFile(filename: string): void {
  try {
    const f = new File(dir(), filename);
    if (f.exists) f.delete();
  } catch {}
}
