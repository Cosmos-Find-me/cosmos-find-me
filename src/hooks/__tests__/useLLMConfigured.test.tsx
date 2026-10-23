import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderToString } from 'react-dom/server'
import { act, renderHook } from '@testing-library/react'
import { LLMService } from '../../utils/llm/service'
import { useLLMConfigured } from '../useLLMConfigured'
import { llmService } from '../../utils/llm/service'

describe('LLMService.subscribe', () => {
  it('notifies listeners when settings change and stops after unsubscribe', async () => {
    const service = new LLMService()
    const listener = vi.fn()
    const unsubscribe = service.subscribe(listener)

    service.clearSettings()
    expect(listener).toHaveBeenCalledTimes(1)

    await service.updateSettings({ provider: 'none', apiKey: '', model: '', maxTokens: 1500, temperature: 0.7 })
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    service.clearSettings()
    expect(listener).toHaveBeenCalledTimes(2)
  })
})

describe('useLLMConfigured', () => {
  afterEach(() => {
    llmService.clearSettings()
  })

  it('renders false on the server so hydration matches', () => {
    const Probe = () => <span>{String(useLLMConfigured())}</span>

    expect(renderToString(<Probe />)).toBe('<span>false</span>')
  })

  it('follows the service on the client and updates when settings change', async () => {
    vi.spyOn(llmService, 'isConfigured').mockReturnValue(true)
    const { result } = renderHook(() => useLLMConfigured())
    expect(result.current).toBe(true)

    vi.mocked(llmService.isConfigured).mockReturnValue(false)
    act(() => llmService.clearSettings())

    expect(result.current).toBe(false)
    vi.restoreAllMocks()
  })
})
