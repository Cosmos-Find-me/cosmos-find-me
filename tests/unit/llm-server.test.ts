// @vitest-environment node
/**
 * @testSuite Dev LLM Server
 * @description Boots server/server.js as a real process and exercises its
 * endpoints without an API key, so Express or dotenv upgrades that break
 * routing, JSON parsing or CORS fail here.
 */
import { spawn, type ChildProcess } from 'child_process'
import { readFileSync } from 'fs'
import { join, resolve } from 'path'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const serverDir = resolve(__dirname, '../../server')
const PORT = 3900 + Math.floor(Math.random() * 90)
const base = `http://localhost:${PORT}`

let server: ChildProcess

beforeAll(async () => {
  server = spawn(process.execPath, ['server.js'], {
    cwd: serverDir,
    // An empty key wins over any server/.env, so no request reaches Anthropic
    env: { ...process.env, PORT: String(PORT), ANTHROPIC_API_KEY: '' },
    stdio: 'pipe',
  })
  await new Promise<void>((ready, fail) => {
    server.stdout!.on('data', (chunk) => String(chunk).includes('running on') && ready())
    server.on('exit', (code) => fail(new Error(`server exited with ${code}`)))
  })
}, 15_000)

afterAll(() => {
  server?.kill()
})

describe('Dev LLM server', () => {
  it('responds to the health check with CORS enabled', async () => {
    const res = await fetch(`${base}/health`, { headers: { Origin: 'http://localhost:3000' } })

    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
    expect(await res.json()).toEqual({ status: 'ok', message: 'LLM API Server running' })
  })

  it('rejects analyze requests when no API key is configured', async () => {
    const res = await fetch(`${base}/api/llm/anthropic/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: { type: 'analyze' } }),
    })

    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ success: false })
  })

  it('reports an unconfigured key from validate', async () => {
    const res = await fetch(`${base}/api/llm/anthropic/validate`, { method: 'POST' })

    expect(await res.json()).toEqual({ valid: false, error: 'API key not configured' })
  })

  it('uses the built-in fetch instead of node-fetch', () => {
    const pkg = JSON.parse(readFileSync(join(serverDir, 'package.json'), 'utf8'))

    expect(pkg.dependencies['node-fetch']).toBeUndefined()
    expect(readFileSync(join(serverDir, 'server.js'), 'utf8')).not.toContain('node-fetch')
  })

  it('reads model IDs from the shared config instead of hardcoding them', () => {
    const source = readFileSync(join(serverDir, 'server.js'), 'utf8')

    expect(source).toContain("require('../src/utils/llm/anthropic-models.json')")
    expect(source).not.toMatch(/['"]claude-[\w.-]+['"]/)
  })

  it('sends no sampling parameters and reads the text block by type', () => {
    const source = readFileSync(join(serverDir, 'server.js'), 'utf8')

    expect(source).not.toMatch(/\btemperature\b/)
    expect(source).not.toContain('content[0]')
  })
})
