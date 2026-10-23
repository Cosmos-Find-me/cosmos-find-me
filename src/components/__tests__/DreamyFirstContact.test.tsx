import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import DreamyFirstContact from '../DreamyFirstContact'

const file = (name: string) => new File(['x'], name, { type: 'application/pdf' })

async function goToUploadStep(onComplete = vi.fn()) {
  const utils = render(<DreamyFirstContact onComplete={onComplete} />)
  // The spark becomes clickable after the intro animation
  await act(async () => {
    vi.advanceTimersByTime(3000)
  })
  fireEvent.click(utils.container.querySelector('.cursor-pointer')!)
  await act(async () => {
    vi.advanceTimersByTime(2000)
  })
  return { ...utils, onComplete }
}

const resumeInput = (container: HTMLElement) => container.querySelector<HTMLInputElement>('#file-resume')!

describe('DreamyFirstContact upload step', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('collects both files and completes with them', async () => {
    const { container, onComplete } = await goToUploadStep()
    const resume = file('resume.pdf')
    const cmf = file('goals.md')

    fireEvent.change(resumeInput(container), { target: { files: [resume] } })
    fireEvent.change(container.querySelector('#file-cmf')!, { target: { files: [cmf] } })
    fireEvent.click(screen.getByText('Generate My Universe'))

    expect(onComplete).toHaveBeenCalledWith(resume, cmf)
  })

  it('lets the user remove a collected file', async () => {
    const { container } = await goToUploadStep()

    fireEvent.change(resumeInput(container), { target: { files: [file('resume.pdf')] } })
    expect(screen.getByText('resume.pdf')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Remove from universe'))
    expect(screen.queryByText('resume.pdf')).not.toBeInTheDocument()
    expect(resumeInput(container)).toBeInTheDocument()
  })

  it('keeps the upload inputs mounted when the parent re-renders', async () => {
    const { container } = await goToUploadStep()
    const input = resumeInput(container)

    // Opening the guide re-renders the parent; the drop zone must not remount
    fireEvent.click(screen.getByText('Guide'))

    expect(resumeInput(container)).toBe(input)
  })
})
