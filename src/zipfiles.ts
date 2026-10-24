import { Buffer } from "node:buffer";

import * as yauzl from "yauzl";

export function fromBuffer(
	buf: Buffer | Uint8Array,
	options: yauzl.Options = {},
): Promise<yauzl.ZipFile> {
	const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
	return yauzl.fromBufferPromise(buffer, options);
}
