import { marked } from 'marked';
import { storage } from '@wxt-dev/storage';
import type { ElementData } from '../../../lib/messaging';

let currentElementData: ElementData | null = null;

export function initAiPanel() {
  const btn = document.getElementById('generate-summary-btn');
  
  btn?.addEventListener('click', async () => {
    if (!currentElementData) return;
    
    const apiKey = await storage.getItem<string>('local:geminiApiKey');
    if (!apiKey) {
      showAiError('Please configure your Gemini API key in Settings first.');
      return;
    }

    const aiResult = document.getElementById('ai-result');
    if (aiResult) {
      aiResult.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">Generating summary... <span class="anatomy-pulse" style="display: inline-block; margin-left: 8px;"></span></div>';
    }
    
    btn.classList.add('hidden');

    try {
      const prompt = buildPrompt(currentElementData);
      const summary = await callGeminiAPI(apiKey, prompt);
      
      if (aiResult) {
        aiResult.innerHTML = marked.parse(summary) as string;
      }
    } catch (err: any) {
      showAiError(err.message || 'Failed to generate summary.');
      btn.classList.remove('hidden');
    }
  });
}

export function resetAiPanel(data: ElementData) {
  currentElementData = data;
  
  const controls = document.querySelector('.ai-controls');
  const emptyState = document.getElementById('ai-panel')?.querySelector('.empty-state');
  const btn = document.getElementById('generate-summary-btn');
  const result = document.getElementById('ai-result');
  
  emptyState?.classList.add('hidden');
  controls?.classList.remove('hidden');
  btn?.classList.remove('hidden');
  
  if (result) {
    result.innerHTML = '';
  }
}

function showAiError(msg: string) {
  const result = document.getElementById('ai-result');
  if (result) {
    result.innerHTML = `<div style="color: #E06C75; background: rgba(224, 108, 117, 0.1); padding: 12px; border-radius: 4px; border: 1px solid #E06C75;">${msg}</div>`;
  }
}

function buildPrompt(data: ElementData): string {
  const frameworkClasses = data.classes.length > 0 ? data.classes.join(' ') : 'None';
  
  return `You are an expert web developer educator. Analyze this HTML element and its CSS styles.
Provide a concise explanation in Markdown format covering:
- **Purpose**: What this element does on the page
- **Structure**: How the HTML is organized
- **Styling**: Key CSS techniques used
- **Framework**: If Bootstrap/Tailwind classes are detected, explain what each class does
- **Accessibility**: Any a11y attributes present and their purpose

Keep it brief — 3-5 short paragraphs max. Use code backticks for class names and properties.

<element>
  <tag>${data.tagName}</tag>
  <id>${data.id}</id>
  <classes>${frameworkClasses}</classes>
  <attributes>${JSON.stringify(data.attributes)}</attributes>
  <html>
    ${data.outerHTML.substring(0, 500)}
  </html>
</element>
`;
}

async function callGeminiAPI(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.2,
      }
    })
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('Rate limit exceeded. Try again in a moment.');
    throw new Error(`API Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
