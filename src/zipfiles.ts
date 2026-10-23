import { Buffer } from "node:buffer";
import type { Readable } from "node:stream";

import yauzl from "yauzl";

export function fromBuffer(
	buf: Buffer | Uint8Array | ArrayBuffer | SharedArrayBuffer,
	options: yauzl.Options = {},
): Promise<yauzl.ZipFile> {
	//@ts-expect-error: This should work
	const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
	return yauzl.fromBufferPromise(buffer, options);
}

export function makeOpenReadStream(
	zipFile: yauzl.ZipFile,
): (entry: yauzl.Entry, options?: yauzl.ZipFileOptions) => Promise<Readable> {
	return (entry: yauzl.Entry, options?: yauzl.ZipFileOptions) => {
		return zipFile.openReadStreamPromise(entry, {
			start: null,
			decrypt: null,
			end: null,
			...options,
		});
	};
}

export { yauzl };
