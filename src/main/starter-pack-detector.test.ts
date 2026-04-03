import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { detectStarterPack } from './starter-pack-detector'

const tempDirs: string[] = []

async function makeTempProject(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'tv-starter-pack-'))
  tempDirs.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('starter-pack-detector', () => {
  it('detects git, node, and docker starter packs from repo signals', async () => {
    const dir = await makeTempProject()
    await mkdir(join(dir, '.git'))
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        scripts: {
          dev: 'vite dev',
          lint: 'eslint .',
          test: 'vitest run',
          build: 'vite build',
          preview: 'vite preview',
          package: 'electron-builder'
        }
      }),
      'utf-8'
    )
    await writeFile(join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: 9', 'utf-8')
    await writeFile(join(dir, 'Dockerfile'), 'FROM node:20', 'utf-8')
    await writeFile(
      join(dir, 'compose.yaml'),
      ['services:', '  api:', '    build: .', '  worker:', '    image: busybox', ''].join('\n'),
      'utf-8'
    )

    const preview = await detectStarterPack(dir)

    expect(preview.detections).toEqual([
      'Git repository',
      'Node package (pnpm)',
      'Docker Compose (2 services)'
    ])
    expect(preview.categories).toEqual(['git', 'package-managers', 'docker'])
    expect(preview.scripts.map((script) => script.name)).toEqual([
      'Git quick check',
      'Start dev server',
      'Verify project',
      'Preview production build',
      'Package app',
      'Start containers',
      'Tail api logs'
    ])
    expect(preview.snippets.map((snippet) => snippet.name)).toEqual([
      'git checkout branch',
      'Run package script',
      'Build local image',
      'Compose service',
      'Compose logs'
    ])
    expect(preview.snippets.find((snippet) => snippet.name === 'Run package script')?.template).toBe(
      'pnpm run {{script:dev}}'
    )
    expect(preview.snippets.find((snippet) => snippet.name === 'Compose service')?.template).toBe(
      'docker compose up {{service:api}}'
    )
  })

  it('returns an empty starter pack for a blank directory', async () => {
    const dir = await makeTempProject()

    await expect(detectStarterPack(dir)).resolves.toEqual({
      detections: [],
      categories: [],
      scripts: [],
      snippets: []
    })
  })

  it('detects Makefile targets and turns them into starters', async () => {
    const dir = await makeTempProject()
    await writeFile(
      join(dir, 'Makefile'),
      ['.PHONY: dev lint test build', 'dev:', '\tnpm run dev', 'lint:', '\tnpm run lint', 'test:', '\tnpm test', 'build:', '\tnpm run build', ''].join('\n'),
      'utf-8'
    )

    const preview = await detectStarterPack(dir)

    expect(preview.detections).toEqual(['Makefile (4 targets)'])
    expect(preview.categories).toEqual([])
    expect(preview.scripts.map((script) => script.name)).toEqual([
      'Start via make',
      'Verify via make'
    ])
    expect(preview.snippets).toEqual([
      {
        name: 'Run make target',
        description: 'Execute a detected Makefile target with a reusable template.',
        template: 'make {{target:dev}}'
      }
    ])
  })

  it('detects uv-based Python repos and derives starter commands from project files', async () => {
    const dir = await makeTempProject()
    await writeFile(
      join(dir, 'pyproject.toml'),
      [
        '[project]',
        'name = "sample-app"',
        '',
        '[project.scripts]',
        'api = "sample.cli:main"',
        '',
        '[tool.pytest.ini_options]',
        'testpaths = ["tests"]',
        ''
      ].join('\n'),
      'utf-8'
    )
    await writeFile(join(dir, 'uv.lock'), 'version = 1', 'utf-8')
    await mkdir(join(dir, 'tests'))

    const preview = await detectStarterPack(dir)

    expect(preview.detections).toEqual(['Python project (uv)'])
    expect(preview.categories).toEqual(['python'])
    expect(preview.scripts.map((script) => script.name)).toEqual([
      'Sync Python environment',
      'Run Python tests',
      'Run api'
    ])
    expect(preview.scripts[2].steps[0].commandString).toBe('uv run api')
    expect(preview.snippets).toEqual([
      {
        name: 'Run Python command',
        description: 'Execute a Python command inside the managed project environment.',
        template: 'uv run {{command:pytest}}'
      }
    ])
  })

  it('detects Poetry projects and Django entrypoints', async () => {
    const dir = await makeTempProject()
    await writeFile(
      join(dir, 'pyproject.toml'),
      ['[tool.poetry]', 'name = "service"', 'version = "0.1.0"', ''].join('\n'),
      'utf-8'
    )
    await writeFile(join(dir, 'poetry.lock'), '# lock', 'utf-8')
    await writeFile(join(dir, 'manage.py'), 'print("django")', 'utf-8')
    await writeFile(join(dir, 'pytest.ini'), '[pytest]\n', 'utf-8')

    const preview = await detectStarterPack(dir)

    expect(preview.detections).toEqual(['Python project (Poetry)'])
    expect(preview.categories).toEqual(['python'])
    expect(preview.scripts.map((script) => script.name)).toEqual([
      'Install Poetry environment',
      'Run Python tests',
      'Start Django dev server'
    ])
    expect(preview.scripts[2].steps[0].commandString).toBe('poetry run python manage.py runserver')
    expect(preview.snippets).toEqual([
      {
        name: 'Run Python command',
        description: 'Execute a Python command inside the managed project environment.',
        template: 'poetry run {{command:pytest}}'
      }
    ])
  })

  it('detects Rust crates and seeds cargo starters', async () => {
    const dir = await makeTempProject()
    await writeFile(
      join(dir, 'Cargo.toml'),
      ['[package]', 'name = "starter-app"', 'version = "0.1.0"', 'edition = "2021"', ''].join('\n'),
      'utf-8'
    )
    await mkdir(join(dir, 'src'))
    await writeFile(join(dir, 'src', 'main.rs'), 'fn main() {}', 'utf-8')

    const preview = await detectStarterPack(dir)

    expect(preview.detections).toEqual(['Rust crate'])
    expect(preview.categories).toEqual(['rust'])
    expect(preview.scripts.map((script) => script.name)).toEqual([
      'Build Rust project',
      'Run Rust tests',
      'Run Rust app'
    ])
    expect(preview.snippets).toEqual([
      {
        name: 'cargo run target',
        description: 'Run a specific Rust binary target with Cargo.',
        template: 'cargo run --bin {{binary:starter-app}}'
      },
      {
        name: 'cargo test filter',
        description: 'Run Rust tests matching a specific filter.',
        template: 'cargo test {{filter:config}}'
      }
    ])
  })

  it('detects Go modules and seeds go starters', async () => {
    const dir = await makeTempProject()
    await writeFile(join(dir, 'go.mod'), 'module github.com/example/service\n\ngo 1.22\n', 'utf-8')
    await writeFile(join(dir, 'main.go'), 'package main\nfunc main() {}\n', 'utf-8')

    const preview = await detectStarterPack(dir)

    expect(preview.detections).toEqual(['Go module'])
    expect(preview.categories).toEqual(['go'])
    expect(preview.scripts.map((script) => script.name)).toEqual([
      'Build Go module',
      'Run Go tests',
      'Run Go app'
    ])
    expect(preview.snippets).toEqual([
      {
        name: 'go run target',
        description: 'Run a Go package, module, or file directly.',
        template: 'go run {{target:.}}'
      },
      {
        name: 'go test packages',
        description: 'Run Go tests for one or more packages.',
        template: 'go test {{packages:./...}}'
      }
    ])
  })
})
