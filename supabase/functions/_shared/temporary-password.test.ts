import { describe, expect, it } from "vitest"
import { generateTemporaryPassword } from "./temporary-password"

describe("generateTemporaryPassword", () => {
  it("makes four groups of four characters without look-alikes", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateTemporaryPassword()).toMatch(/^[a-km-np-zA-HJ-NP-Z2-9]{4}(-[a-km-np-zA-HJ-NP-Z2-9]{4}){3}$/)
    }
  })

  it("never repeats a password", () => {
    const passwords = Array.from({ length: 1000 }, generateTemporaryPassword)
    expect(new Set(passwords).size).toBe(passwords.length)
  })
})
