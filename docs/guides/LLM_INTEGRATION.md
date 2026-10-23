# LLM Integration Guide

## Current Implementation (Demo)

This application currently uses **enhanced mock data** to demonstrate the LLM integration concept. The UI shows how real AI analysis would work without requiring complex setup.

### What Works Now:
- ✅ API key format validation
- ✅ Provider selection UI
- ✅ Enhanced mock data generation
- ✅ Realistic company analysis results

## Production Implementation

For real LLM integration, implement secure backend API routes:

### Option 1: Next.js API Routes

```javascript
// pages/api/llm/analyze-company.js
export default async function handler(req, res) {
  const { provider, request } = req.body;
  
  // Server-side API key from environment
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5-5',
      max_tokens: 8000, // thinking counts toward max_tokens
      messages: [{ role: 'user', content: buildPrompt(request) }]
    })
  });
  
  const data = await response.json();
  res.json(data);
}
```

### Option 2: Serverless Functions (Vercel/Netlify)

```javascript
// api/llm-analyze.js
export default async function handler(req, res) {
  // Same implementation as above
  // Deployed as serverless function
}
```

### Option 3: Express.js Backend

```javascript
// server/routes/llm.js
app.post('/api/llm/analyze', async (req, res) => {
  // Same implementation
  // Full backend server
});
```

## Security Best Practices

1. **Never expose API keys in client code**
2. **Use environment variables** for sensitive data
3. **Implement rate limiting** to prevent abuse
4. **Validate requests** on the server side
5. **Add authentication** for production use

## Frontend Updates for Production

Update the provider files to call your backend:

```typescript
// src/utils/llm/providers/anthropic.ts
async analyzeCompany(request: CompanyAnalysisRequest): Promise<LLMResponse> {
  const response = await fetch('/api/llm/analyze-company', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      provider: 'anthropic', 
      request 
    })
  });
  
  return await response.json();
}
```

## Why This Approach?

- **Security**: API keys stay server-side
- **Performance**: Backend can cache and optimize
- **Scalability**: Better rate limiting and error handling
- **Cost Control**: Monitor and limit usage centrally
- **Reliability**: Proper error handling and retries

## Development vs Production

| Aspect | Demo (Current) | Production |
|--------|---------------|------------|
| API Keys | Client-side (demo only) | Server-side env vars |
| CORS | Browser limitation | Handled by backend |
| Validation | Format checking | Real API validation |
| Data | Enhanced mock | Real LLM responses |
| Security | Demo purposes | Production security |

The current implementation showcases the complete UI/UX flow while maintaining security best practices for production deployment.