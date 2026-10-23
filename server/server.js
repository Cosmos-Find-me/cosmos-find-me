const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Anthropic model configuration - single source of truth
// Keep in sync with src/utils/llm/config.ts
const ANTHROPIC_MODELS = {
  OPUS_4_5: 'claude-opus-4-5-20251101',
  SONNET_4_5: 'claude-sonnet-4-5-20250929',
  HAIKU_4_5: 'claude-haiku-4-5-20251001',
};

// Task-based model selection (mirrors src/utils/llm/config.ts)
const TASK_MODELS = {
  PROFILE_EXTRACTION: ANTHROPIC_MODELS.OPUS_4_5,
  COMPANY_ANALYSIS: ANTHROPIC_MODELS.SONNET_4_5,
  COMPANY_EXTRACTION: ANTHROPIC_MODELS.SONNET_4_5,
  API_VALIDATION: ANTHROPIC_MODELS.HAIKU_4_5,
  DEFAULT: ANTHROPIC_MODELS.SONNET_4_5,
};

const getModelForTask = (task) => TASK_MODELS[task] || TASK_MODELS.DEFAULT;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'LLM API Server running' });
});

// Anthropic Claude API
app.post('/api/llm/anthropic/analyze', async (req, res) => {
  try {
    const { request } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'ANTHROPIC_API_KEY not configured in environment variables' 
      });
    }

    const prompt = buildAnthropicPrompt(request);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: getModelForTask('COMPANY_ANALYSIS'),
        max_tokens: 1500,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const responseText = data.content[0]?.text;

    if (!responseText) {
      throw new Error('No response content from Claude API');
    }

    // Parse the JSON response
    const companyData = parseAnthropicResponse(responseText);

    res.json({
      success: true,
      data: companyData,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        totalCost: calculateAnthropicCost(data.usage?.input_tokens || 0, data.usage?.output_tokens || 0)
      }
    });

  } catch (error) {
    console.error('Anthropic API error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze company with Claude'
    });
  }
});

// Anthropic key validation
app.post('/api/llm/anthropic/validate', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.json({ valid: false, error: 'API key not configured' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: getModelForTask('API_VALIDATION'),
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });

    res.json({ valid: response.ok });

  } catch (error) {
    res.json({ valid: false, error: error.message });
  }
});

// Helper function to build Anthropic prompt
function buildAnthropicPrompt(request) {
  return `Analyze "${request.companyName}" and provide comprehensive company information as JSON.

User's Candidate Market Fit (CMF) Criteria:
- Target Role: ${request.userCMF.targetRole}
- Must-Haves: ${request.userCMF.mustHaves.join(', ')}
${request.userCMF.wantToHave?.length ? `- Want-to-Have: ${request.userCMF.wantToHave.join(', ')}` : ''}
${request.userCMF.experience?.length ? `- Experience: ${request.userCMF.experience.join(', ')}` : ''}
${request.userCMF.targetCompanies ? `- Target Companies: ${request.userCMF.targetCompanies}` : ''}

Provide a JSON response with this exact structure:

{
  "name": "Company Name",
  "industry": "Primary industry (e.g., AI/ML, Fintech, Gaming, Healthcare)",
  "stage": "Company stage (Early Stage, Late Stage, Public, Mature)",
  "location": "Primary location (e.g., San Francisco, CA)",
  "employees": "Employee range (e.g., ~500, 1000-5000, 10000+)",
  "remote": "Remote policy (Remote-Friendly, Hybrid, In-Office)",
  "openRoles": 15,
  "matchScore": 85,
  "matchReasons": [
    "Specific reason why this company matches user's criteria",
    "Another specific alignment with their requirements",
    "Additional match reason based on their experience"
  ],
  "connections": ["Company1", "Company2", "Company3"],
  "connectionTypes": {
    "Company1": "Direct Competitor",
    "Company2": "Industry Partner", 
    "Company3": "Similar Stage"
  },
  "description": "Brief company description focusing on what they do and their mission"
}

Calculate matchScore (0-100) by evaluating:
1. Alignment with must-have criteria (weighted most heavily)
2. Fit with target role and company stage
3. Relevance to experience background
4. Match with want-to-have preferences

Be accurate and base analysis on real company information. Return only valid JSON.`;
}

// Helper function to parse Anthropic response
function parseAnthropicResponse(responseText) {
  try {
    // Clean up potential markdown formatting
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Failed to parse Claude response:', responseText);
    throw new Error('Invalid JSON response from Claude API');
  }
}

// Helper function to calculate costs
function calculateAnthropicCost(inputTokens, outputTokens) {
  // Claude 3.5 Sonnet pricing
  const inputPrice = 3; // $3 per 1M tokens
  const outputPrice = 15; // $15 per 1M tokens
  
  const inputCost = (inputTokens / 1000000) * inputPrice;
  const outputCost = (outputTokens / 1000000) * outputPrice;
  return inputCost + outputCost;
}

app.listen(PORT, () => {
  console.log(`🚀 LLM API Server running on http://localhost:${PORT}`);
  console.log('📝 Configure your environment variables:');
  console.log('   ANTHROPIC_API_KEY=your_claude_api_key');
  console.log('');
  console.log('🔗 Test endpoints:');
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`   POST http://localhost:${PORT}/api/llm/anthropic/analyze`);
  console.log(`   POST http://localhost:${PORT}/api/llm/anthropic/validate`);
});