import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { render, screen } from '@testing-library/react'
import { CosmosBackground } from '../CosmosBackground'

describe('CosmosBackground', () => {
  it('renders its children', () => {
    render(<CosmosBackground><p>content</p></CosmosBackground>)

    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('includes the stars in the server-rendered HTML (no pop-in after hydration)', () => {
    const html = renderToString(<CosmosBackground><p>content</p></CosmosBackground>)

    expect(html.match(/animate-pulse opacity-30/g)).toHaveLength(12)
  })
})
