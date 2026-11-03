// Leaves out look-alikes (0/O, 1/l/I), since the password is passed on by hand and may be typed over on a phone.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"
const GROUPS = 4
const GROUP_LENGTH = 4

/** Bytes from here up are skipped: they would make the first characters of the alphabet more likely. */
const UNBIASED_BYTES = 256 - (256 % ALPHABET.length)

/** A random password for a new account, like `k7Rm-xQ3z-Hn9P-w2Ta` (about 90 bits). */
export function generateTemporaryPassword(): string {
  const length = GROUPS * GROUP_LENGTH
  let characters = ""
  while (characters.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (byte < UNBIASED_BYTES && characters.length < length) characters += ALPHABET[byte % ALPHABET.length]
    }
  }
  return characters.match(new RegExp(`.{${GROUP_LENGTH}}`, "g"))!.join("-")
}
