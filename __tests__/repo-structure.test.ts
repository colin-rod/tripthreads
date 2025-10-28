import { existsSync } from 'fs'
import { resolve } from 'path'

describe('Monorepo Structure', () => {
  it('should have apps/web directory', () => {
    expect(existsSync(resolve(__dirname, '../apps/web'))).toBe(true)
  })

  it('should have apps/mobile directory', () => {
    expect(existsSync(resolve(__dirname, '../apps/mobile'))).toBe(true)
  })

  it('should have packages/shared directory', () => {
    expect(existsSync(resolve(__dirname, '../packages/shared'))).toBe(true)
  })

  it('should have turbo.json config', () => {
    expect(existsSync(resolve(__dirname, '../turbo.json'))).toBe(true)
  })

  it('should have root package.json', () => {
    expect(existsSync(resolve(__dirname, '../package.json'))).toBe(true)
  })
})
