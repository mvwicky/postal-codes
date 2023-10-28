type XoroshiroState = [bigint, bigint];

/** Random number generator for unsigned integers. */
class URNG_32 {
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

const DEFAULT_URNG = new URNG_32();

const DEFAULT_SEED: XoroshiroState = [
  BigInt("0xdeadbeefcafebabe"),
  BigInt("0x8badf00dbaada555"),
];

function* xoroshiro128plus(
  seed?: XoroshiroState,
): Generator<bigint, void, unknown> {
  const s: XoroshiroState = seed ?? DEFAULT_SEED;
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

export { DEFAULT_URNG, URNG_32, xoroshiro128plus };
