function* decodeStringGen(
  inputString: string,
): Generator<number, void, unknown> {
  let counter = 0;
  const length = inputString.length;
  while (counter < length) {
    const val = inputString.charCodeAt(counter++);
    if (val >= 55296 && val <= 56319 && counter < length) {
      // High surrogate, not at end of input
      const extra = inputString.charCodeAt(counter++);
      if ((extra & 64512) === 56320) {
        // Low surrogate
        yield ((val & 1023) << 10) + (extra & 1023) + 65536;
      } else {
        // Unmatched surrogate; only append the current value
        yield val;
        counter--;
      }
    } else {
      yield val;
    }
  }
}

function decodeString(inputString: string): number[] {
  return Array.from(decodeStringGen(inputString));
}

export { decodeString, decodeStringGen };
