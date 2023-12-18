import { logger } from "./log.ts";
import { decodeString } from "./decode-string.ts";

type XoroshiroState = [bigint, bigint];

abstract class RNGBase {
  abstract get value(): number;

  valueIn(start: number, stop: number): number;
  valueIn(stop: number): number;
  valueIn(start: number, stop?: number): number {
    if (typeof stop !== "number") {
      stop = start;
      start = 0;
    }
    const n = stop - start;
    return (this.value % n) + start;
  }

  choice<T>(arr: ArrayLike<T>): T {
    return arr[this.valueIn(arr.length)];
  }
}

/** Random number generator for unsigned integers. */
class URNG_32 extends RNGBase {
  static readonly #arrSize = 256;
  static readonly #max = 2 ** 32 - 1;
  /** A buffer of randomly generated values. */
  readonly #arr: Uint32Array = new Uint32Array(URNG_32.#arrSize);
  #idx: number = this.#arr.length;

  private fill() {
    crypto.getRandomValues(this.#arr);
    this.#idx = 0;
  }

  get value(): number {
    if (this.#idx === this.#arr.length) {
      this.fill();
    }
    const n = this.#arr[this.#idx];
    this.#idx += 1;
    return n;
  }

  get normValue(): number {
    return this.value / URNG_32.#max;
  }
}

class URNG_16 extends RNGBase {
  static readonly #arrSize = 256;
  static readonly #max = 2 ** 32 - 1;

  /** A buffer of randomly generated values. */
  readonly #arr: Uint16Array = new Uint16Array(URNG_16.#arrSize);
  #idx: number = this.#arr.length;

  private fill() {
    crypto.getRandomValues(this.#arr);
    this.#idx = 0;
  }

  get value(): number {
    if (this.#idx === this.#arr.length) {
      this.fill();
    }
    const n = this.#arr[this.#idx];
    this.#idx += 1;
    return n;
  }

  get normValue(): number {
    return this.value / URNG_16.#max;
  }
}

function makeMash() {
  let n = 0xefc8249d;
  return (data: string | number[]) => {
    const inpData = typeof data === "string" ? decodeString(data) : data;
    for (let i = 0; i < inpData.length; i++) {
      n += inpData[i];
      let h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000;
    }
    return (n >>> 0) * 2.3283064365386963e-10;
  };
}

class Alea {
  #c = 1;
  #s0: number;
  #s1: number;
  #s2: number;

  constructor(seed: string) {
    const mash = makeMash();
    this.#s0 = mash(" ");
    this.#s1 = mash(" ");
    this.#s2 = mash(" ");

    const seedData = decodeString(seed);
    this.#s0 -= mash(seedData);
    if (this.#s0 < 0) {
      this.#s0 += 1;
    }
    this.#s1 -= mash(seedData);
    if (this.#s1 < 0) {
      this.#s1 += 1;
    }
    this.#s2 -= mash(seedData);
    if (this.#s2 < 0) {
      this.#s2 += 1;
    }
  }

  next(): number {
    const t = 2091639 * this.#s0 + this.#c * 2.3283064365386963e-10;
    this.#s0 = this.#s1;
    this.#s1 = this.#s2;
    return this.#s2 = t - (this.#c = t | 0);
  }

  int32(): number {
    return (this.next() * 0x100000000) | 0;
  }

  uint32(): number {
    let i = 0;
    let v: number;
    while ((v = this.int32()) < 0) {
      i++;
    }
    if (i > 1) {
      logger().debug(`UInt generation took ${i} iterations`);
    }
    return v;
  }
}

const DEFAULT_URNG32 = new URNG_32();
const DEFAULT_URNG16 = new URNG_16();

const DEFAULT_SEED: XoroshiroState = [
  BigInt("0xdeadbeefcafebabe"),
  BigInt("0x8badf00dbaada555"),
];

async function makeSeed(s: string): Promise<number> {
  const decoded = decodeString(s);
  const asBytes = Uint8Array.from(decoded);
  await crypto.subtle.digest("SHA-512", asBytes);
  const rawCode = [...s].reduce((a, b) => a ^ b.charCodeAt(0), 0);
  return (rawCode << 2) | 1;
}

async function toX128State(
  seed?: XoroshiroState | number | string,
): Promise<XoroshiroState> {
  if (typeof seed === "number") {
    return [BigInt(seed), DEFAULT_SEED[1]];
  } else if (typeof seed === "string") {
    return toX128State(await makeSeed(seed));
  }
  return seed ?? DEFAULT_SEED;
}

async function* xoroshiro128plus(
  seed?: XoroshiroState | number | string,
): AsyncGenerator<bigint, void, unknown> {
  const s: XoroshiroState = await toX128State(seed);
  console.log({ s });
  while (true) {
    const s0 = s[0];
    let s1 = s[1];
    const result = s0 + s1;
    console.log(result);
    s1 ^= s0;
    s[0] = ((s0 << BigInt(24)) | (s0 >> BigInt(40))) ^ s1 ^ (s1 << BigInt(16));
    s[1] = (s1 << BigInt(37)) | (s1 >> BigInt(27));
    yield BigInt.asUintN(64, result);
  }
}

export { Alea, DEFAULT_URNG16, DEFAULT_URNG32, URNG_32, xoroshiro128plus };
