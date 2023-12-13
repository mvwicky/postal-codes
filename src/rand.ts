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

const DEFAULT_URNG32 = new URNG_32();
const DEFAULT_URNG16 = new URNG_16();

const DEFAULT_SEED: XoroshiroState = [
  BigInt("0xdeadbeefcafebabe"),
  BigInt("0x8badf00dbaada555"),
];

function makeSeed(s: string): number {
  const rawCode = [...s].reduce((a, b) => a ^ b.charCodeAt(0), 0);
  return (rawCode << 2) | 1;
}

function toX128State(seed?: XoroshiroState | number | string): XoroshiroState {
  if (typeof seed === "number") {
    return [BigInt(seed), DEFAULT_SEED[1]];
  } else if (typeof seed === "string") {
    return toX128State(makeSeed(seed));
  }
  return seed ?? DEFAULT_SEED;
}

function* xoroshiro128plus(
  seed?: XoroshiroState | number | string,
): Generator<bigint, void, unknown> {
  const s: XoroshiroState = toX128State(seed);
  while (true) {
    const s0 = s[0];
    let s1 = s[1];
    const result = s0 + s1;
    s1 ^= s0;
    s[0] = ((s0 << BigInt(24)) | (s0 >> BigInt(40))) ^ s1 ^ (s1 << BigInt(16));
    s[1] = (s1 << BigInt(37)) | (s1 >> BigInt(27));
    yield BigInt.asUintN(64, result);
  }
}

export { DEFAULT_URNG16, DEFAULT_URNG32, URNG_32, xoroshiro128plus };
