import { marked } from 'marked';
import { storage } from '@wxt-dev/storage';
import type { ElementData } from '../../../lib/messaging';

let currentElementData: ElementData | null = null;
let chatHistory: any[] = [];

export function initAiPanel() {
  const btn = document.getElementById('generate-summary-btn');
  const chatSubmitBtn = document.getElementById('ai-chat-submit-btn');
  const chatInput = document.getElementById('ai-chat-input') as HTMLInputElement;
  
  btn?.addEventListener('click', async () => {
    if (!currentElementData) return;
    
    const apiKey = await storage.getItem<string>('local:geminiApiKey');
    if (!apiKey) {
      showAiError('Please configure your Gemini API key in Settings first.', true);
      return;
    }

    const aiResult = document.getElementById('ai-result');
    if (aiResult) {
      aiResult.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">Generating summary... <span class="anatomy-pulse" style="display: inline-block; margin-left: 8px;"></span></div>';
    }
    
    btn.classList.add('hidden');

    try {
      const prompt = buildPrompt(currentElementData);
      chatHistory = [{ role: 'user', parts: [{ text: prompt }] }];
      const summary = await callGeminiAPI(apiKey, chatHistory);
      chatHistory.push({ role: 'model', parts: [{ text: summary }] });
      
      if (aiResult) {
        aiResult.innerHTML = marked.parse(summary) as string;
      }
      document.getElementById('ai-chat-controls')?.classList.remove('hidden');
    } catch (err: any) {
      showAiError(err.message || 'Failed to generate summary.', true);
      btn.classList.remove('hidden');
    }
  });

  chatSubmitBtn?.addEventListener('click', async () => {
    if (!chatInput || !chatInput.value.trim()) return;
    const apiKey = await storage.getItem<string>('local:geminiApiKey');
    if (!apiKey) {
      showAiError('Please configure your Gemini API key in Settings first.', false);
      return;
    }

    const question = chatInput.value.trim();
    chatInput.value = '';
    
    const aiResult = document.getElementById('ai-result');
    if (aiResult) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = `<div class="mt-4" style="color: var(--text-secondary); border-top: 1px solid var(--border-color); padding-top: 12px;"><strong>You:</strong> ${question}</div><div id="loading-answer" style="color: var(--text-secondary); padding: 12px 0;">Thinking... <span class="anatomy-pulse" style="display: inline-block; margin-left: 8px;"></span></div>`;
      while (wrapper.firstChild) aiResult.appendChild(wrapper.firstChild);
    }

    try {
      chatHistory.push({ role: 'user', parts: [{ text: question }] });
      const answer = await callGeminiAPI(apiKey, chatHistory);
      chatHistory.push({ role: 'model', parts: [{ text: answer }] });

      if (aiResult) {
        const loadingEl = document.getElementById('loading-answer');
        if (loadingEl) loadingEl.remove();
        const answerEl = document.createElement('div');
        answerEl.className = 'mt-2';
        answerEl.style.paddingBottom = '12px';
        answerEl.innerHTML = `<strong>AI:</strong><br/> ${marked.parse(answer) as string}`;
        aiResult.appendChild(answerEl);
      }
    } catch (err: any) {
      const loadingEl = document.getElementById('loading-answer');
      if (loadingEl) loadingEl.remove();
      showAiError(err.message || 'Failed to get answer.', false);
      chatHistory.pop(); // Remove the user question from history since it failed
    }
  });
  
  chatInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      chatSubmitBtn?.click();
    }
  });
}

export function resetAiPanel(data: ElementData) {
  currentElementData = data;
  chatHistory = [];
  
  const controls = document.querySelector('.ai-controls');
  const emptyState = document.getElementById('ai-panel')?.querySelector('.empty-state');
  const btn = document.getElementById('generate-summary-btn');
  const result = document.getElementById('ai-result');
  const chatControls = document.getElementById('ai-chat-controls');
  const chatInput = document.getElementById('ai-chat-input') as HTMLInputElement;
  
  emptyState?.classList.add('hidden');
  controls?.classList.remove('hidden');
  btn?.classList.remove('hidden');
  chatControls?.classList.add('hidden');
  if (chatInput) chatInput.value = '';
  
  if (result) {
    result.innerHTML = '';
  }
}

function showAiError(msg: string, clear: boolean = false) {
  const result = document.getElementById('ai-result');
  if (result) {
    if (clear) result.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `<div style="color: #E06C75; background: rgba(224, 108, 117, 0.1); padding: 12px; border-radius: 4px; border: 1px solid #E06C75; margin-top: 12px;">${msg}</div>`;
    result.appendChild(errorDiv.firstElementChild!);
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

async function callGeminiAPI(apiKey: string, contents: any[]): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: contents,
      generationConfig: {
        temperature: 0.2,
      }
    })
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('Rate limit exceeded. Try again in a moment.');
    
    let errorDetail = `HTTP ${response.status}`;
    if (response.statusText && response.statusText.trim() !== '') {
      errorDetail += ` - ${response.statusText}`;
    } else {
      errorDetail += ` (Network error or CORS issue)`;
    }

    try {
      const errorBody = await response.json();
      if (errorBody?.error?.message) {
        errorDetail = errorBody.error.message;
      }
    } catch (e) {
      console.error("Failed to parse error JSON", e);
    }
    
    throw new Error(`Gemini API Error: ${errorDetail || 'Unknown error occurred'}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
