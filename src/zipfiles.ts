import { type Buffer } from "node:buffer";
import { type Readable } from "node:stream";

// @deno-types="npm:@types/yauzl"
import yauzl from "yauzl";

export function fromBuffer(
  buf: Buffer,
  options: yauzl.Options = {},
): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buf, options, (err, resp) => {
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
