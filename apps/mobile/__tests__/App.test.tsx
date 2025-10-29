import { existsSync } from 'fs'
import { resolve } from 'path'

describe('Mobile App', () => {
  it('should have app directory', () => {
    expect(existsSync(resolve(__dirname, '../app'))).toBe(true)
  })

  it('should have index.tsx', () => {
    expect(existsSync(resolve(__dirname, '../app/index.tsx'))).toBe(true)
  })

  it('should have _layout.tsx', () => {
    expect(existsSync(resolve(__dirname, '../app/_layout.tsx'))).toBe(true)
  })
})
