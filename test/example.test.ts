import { describe, it, expect } from 'vitest'

// ESLint is desable in this file
describe('JavaScript weird equality & coercion', () => {
  it('number vs string', () => {
    expect(1 == '1').toBe(true)
    expect(1 === '1').toBe(false)
  })

  it('boolean coercion', () => {
    expect(0 == false).toBe(true)
    expect(1 == true).toBe(true)
    expect(0 === false).toBe(false)
  })

  it('empty string and false', () => {
    expect('' == false).toBe(true)
    expect('' === false).toBe(false)
  })

  it('null and undefined', () => {
    expect(null == undefined).toBe(true)
    expect(null === undefined).toBe(false)
  })

  it('NaN is never equal (even to itself)', () => {
    expect(NaN == NaN).toBe(false)
    expect(NaN === NaN).toBe(false)
    expect(Number.isNaN(NaN)).toBe(true)
  })

  it('array coercion', () => {
    expect([] == false).toBe(true)
    expect([] == '').toBe(true)
    expect([1] == 1).toBe(true)
    expect([1, 2] == '1,2').toBe(true)
  })

  it('object coercion', () => {
    expect({} == {}).toBe(false) // different references
    expect([] == []).toBe(false)
  })

  it('crazy one: [] == ![]', () => {
    expect([] == ![]).toBe(true)
    // explanation:
    // ![] → false
    // [] → '' → 0
    // false → 0
    // 0 == 0 → true
  })

  it('string + number vs - operator', () => {
    expect('5' + 1).toBe('51')
    expect('5' - 1).toBe(4)
  })

  it('truthy/falsy madness', () => {
    expect(Boolean('')).toBe(false)
    expect(Boolean('0')).toBe(true)
    expect(Boolean([])).toBe(true)
    expect(Boolean({})).toBe(true)
    expect(Boolean(0)).toBe(false)
    expect(Boolean(null)).toBe(false)
    expect(Boolean(undefined)).toBe(false)
    expect(Boolean(NaN)).toBe(false)
  })

  it('date weirdness', () => {
    const d = new Date(0)
    expect(d == 0).toBe(false)
    expect(d.valueOf() == 0).toBe(true)
  })

  it('explicit coercion is predictable', () => {
    expect(Number('')).toBe(0)
    expect(Number(null)).toBe(0)
    expect(Number(undefined)).toBeNaN()
  })

  it('symbol uniqueness', () => {
    const a = Symbol('x')
    const b = Symbol('x')
    expect(a === b).toBe(false)
  })

  it('bigint vs number', () => {
    expect(1n == 1).toBe(true)
    expect(1n === 1).toBe(false)
  })
})
