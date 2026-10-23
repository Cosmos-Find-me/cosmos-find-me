import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'tok-123' }),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('../../lib/supabase', () => ({ createClientComponentClient: () => null }))

const { default: InvitePage } = await import('../../../app/invite/[token]/page')

const respond = (ok: boolean, body: unknown) =>
  vi.fn(async () => ({ ok, json: async () => body }) as Response) as unknown as typeof fetch

describe('Invite page', () => {
  it('verifies the token and shows who the invitation is for', async () => {
    global.fetch = respond(true, { invitation: { email: 'ada@example.com', full_name: 'Ada Lovelace' } })

    render(<InvitePage />)

    expect(screen.getByText('Verifying invitation...')).toBeInTheDocument()
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith('/api/invite/tok-123')
  })

  it('shows the error for an invalid invitation', async () => {
    global.fetch = respond(false, { error: 'Invitation has expired' })

    render(<InvitePage />)

    expect(await screen.findByText('Invalid Invitation')).toBeInTheDocument()
    expect(screen.getByText('Invitation has expired')).toBeInTheDocument()
  })

  it('falls back to a generic message when the request fails', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('offline')
    }) as unknown as typeof fetch

    render(<InvitePage />)

    expect(await screen.findByText('Failed to verify invitation')).toBeInTheDocument()
  })
})
