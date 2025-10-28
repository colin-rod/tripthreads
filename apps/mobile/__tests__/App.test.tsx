describe('Mobile App', () => {
  it('should have app directory', () => {
    const fs = require('fs')
    const path = require('path')
    expect(fs.existsSync(path.resolve(__dirname, '../app'))).toBe(true)
  })

  it('should have index.tsx', () => {
    const fs = require('fs')
    const path = require('path')
    expect(fs.existsSync(path.resolve(__dirname, '../app/index.tsx'))).toBe(true)
  })

  it('should have _layout.tsx', () => {
    const fs = require('fs')
    const path = require('path')
    expect(fs.existsSync(path.resolve(__dirname, '../app/_layout.tsx'))).toBe(true)
  })
})
