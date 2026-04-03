import { describe, expect, it } from 'vitest'
import { parseTemplateVariables, resolveTemplate } from './snippet-schema'

describe('snippet-schema', () => {
  it('extracts unique variables in order and derives readable labels', () => {
    expect(
      parseTemplateVariables('docker run -p {{hostPort:3000}}:80 {{image_name}} {{hostPort}}')
    ).toEqual([
      { name: 'hostPort', label: 'Host Port', defaultValue: '3000' },
      { name: 'image_name', label: 'Image Name', defaultValue: '' }
    ])
  })

  it('resolves provided values and falls back to defaults', () => {
    expect(
      resolveTemplate('ssh {{user:root}}@{{host}} -p {{port:22}}', {
        host: 'example.com'
      })
    ).toBe('ssh root@example.com -p 22')
  })
})
