import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { StarField } from '../StarField'

const positions = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-star]')).map((el) => el.getAttribute('style'))

describe('StarField', () => {
  it('renders the requested number of stars', () => {
    const { container } = render(<StarField count={12} />)

    expect(container.querySelectorAll('[data-star]')).toHaveLength(12)
  })

  it('keeps star positions stable across re-renders', () => {
    const { container, rerender } = render(<StarField count={8} />)
    const before = positions(container)

    rerender(<StarField count={8} />)

    expect(positions(container)).toEqual(before)
  })

  it('renders custom star content', () => {
    const { container } = render(<StarField count={3} star={<svg data-testid="icon" />} />)

    expect(container.querySelectorAll('[data-testid="icon"]')).toHaveLength(3)
  })
})
