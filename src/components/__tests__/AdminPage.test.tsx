import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../AuthWrapper', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('../../lib/supabase', () => ({ createClientComponentClient: () => null }))

const { default: AdminPage } = await import('../../../app/admin/page')
const { llmService } = await import('../../utils/llm/service')

const respond = (ok: boolean, body: unknown) =>
  vi.fn(async () => ({ ok, json: async () => body }) as Response) as unknown as typeof fetch

describe('Admin page', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('loads and lists users', async () => {
    global.fetch = respond(true, { users: [{ id: '1', email: 'ada@example.com', full_name: 'Ada', role: 'user' }] })

    render(<AdminPage />)

    expect(screen.getByText('Loading users...')).toBeInTheDocument()
    expect(await screen.findByText('ada@example.com')).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/users')
  })

  it('shows the API error when loading users fails', async () => {
    global.fetch = respond(false, { error: 'Admin access required' })

    render(<AdminPage />)

    expect(await screen.findByText('Admin access required')).toBeInTheDocument()
    expect(screen.queryByText('Loading users...')).not.toBeInTheDocument()
  })

  it('reflects whether an LLM provider is configured', async () => {
    global.fetch = respond(true, { users: [] })
    vi.spyOn(llmService, 'isConfigured').mockReturnValue(false)

    render(<AdminPage />)

    expect(await screen.findByText('Configure LLM')).toBeInTheDocument()
  })
})
