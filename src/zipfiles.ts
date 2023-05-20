import { NodeBuffer, type Readable, yauzl } from "../deps.ts";

export function fromBuffer(
  buf: NodeBuffer | ArrayBuffer | SharedArrayBuffer | Uint8Array,
  options: yauzl.Options = {},
): Promise<yauzl.ZipFile> {
  const buffer = NodeBuffer.isBuffer(buf) ? buf : NodeBuffer.from(buf);
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, options, (err, resp) => {
      if (err) {
        reject(err);
      } else {
        resolve(resp);
      }
    });
  });
}

export function makeOpenReadStream(
  zipFile: yauzl.ZipFile,
): (entry: yauzl.Entry, options?: yauzl.ZipFileOptions) => Promise<Readable> {
  return (entry: yauzl.Entry, options?: yauzl.ZipFileOptions) => {
    const opts: yauzl.ZipFileOptions = {
      start: null,
      decrypt: null,
      end: null,
      decompress: entry.isCompressed() ? true : null,
      ...options,
    };
    return new Promise((resolve, reject) => {
      zipFile.openReadStream(entry, opts, (err, stream) => {
        if (err) {
          reject(err);
        } else {
          resolve(stream);
        }
      });
    });
  };
}

export { yauzl };
