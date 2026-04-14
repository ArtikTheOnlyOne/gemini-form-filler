const DEFAULT_CONFIG = {
    apiKey: null,
    model: null,
};

const MAX_RETRIES = 3;
const SKIP_KEYWORD = '__SKIP__';

async function getConfig() {
    const { config } = await chrome.storage.local.get('config');
    return { ...DEFAULT_CONFIG, ...config };
}

async function fetchImageAsBase64(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const mimeType = response.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg';

    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const base64 = btoa(binary);

    return { base64, mimeType };
}

function buildPrompt(question) {
    const { title, type, options, imageUrl } = question;

    const optionsBlock = options !== null
        ? `\nAvailable options:\n${JSON.stringify(options, null, 2)}`
        : '';

    const imageNote = question.imageUrl
        ? '\nThe question contains an image provided below. Use it to answer.'
        : '';

    return `You are an assistant that answers Google Form questions with factual, objectively correct answers.

LANGUAGE RULE:
Respond in the same language as the question text. If the question is in Ukrainian — answer in Ukrainian. If in English — answer in English. And so on.

SKIP RULE:
If the question is personal (asks for name, surname, email, phone, personal opinion, personal experience, preferences, or any information unique to a specific person), OR if there is no single objectively correct answer — respond with exactly:
{"answer": "${SKIP_KEYWORD}"}

RESPONSE FORMAT:
Always respond with a single valid JSON object. No markdown, no code blocks, no explanation — just the raw JSON.

The answer field format depends on the question type:

- short_answer / paragraph
  {"answer": "text string"}

- multiple_choice / dropdown
  {"answer": "exact text of one option"}
  The value MUST exactly match one of the provided options.

- checkboxes
  {"answer": ["option A", "option B"]}
  The values MUST exactly match items from the provided options list.

- linear_scale
  {"answer": 7}
  The value MUST be an integer within the min–max range provided.

- rating
  {"answer": 5}
  The value MUST be an integer from 1 to max.

- radio_grid
  {"answer": {"row label": "column label", "row label 2": "column label 2"}}
  Every row MUST have exactly one column value. Values MUST exactly match provided rows/columns.

- checkbox_grid
  {"answer": {"row label": ["col A", "col B"], "row label 2": ["col C"]}}
  Each row can have one or more column values. Values MUST exactly match provided rows/columns.

- date
  {"answer": "YYYY-MM-DD"}

- time
  {"answer": "HH:MM"}

---

QUESTION:
Type: ${type}
Text: ${title}${optionsBlock}`;
}

async function callGemini(prompt, config, image = null) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

    const parts = [];

    if (image) {
        parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });
    }
    parts.push({ text: prompt });

    const body = {
        contents: [{ parts }],
        generationConfig: {
            temperature: 0,
            maxOutputTokens: 512,
        },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const status = response.status;
        const message = err?.error?.message ?? response.statusText;

        if (status === 429) {
            const details = err?.error?.details ?? [];

            const retryInfo = details.find(d => d['@type']?.includes('RetryInfo'));
            const retryDelay = retryInfo?.retryDelay;
            const retryAfterHeader = response.headers.get('Retry-After');

            const isQuotaExhausted = !retryDelay
                && !retryAfterHeader
                && /quota|exceeded|limit/i.test(message);

            if (isQuotaExhausted) {
                throw Object.assign(new Error(message), { status, quotaExhausted: true });
            }

            let waitSeconds = 60;
            if (retryDelay) {
                waitSeconds = parseInt(retryDelay) || waitSeconds;
            } else if (retryAfterHeader) {
                waitSeconds = parseInt(retryAfterHeader) || waitSeconds;
            }

            throw Object.assign(new Error(message), { status, waitSeconds });
        }

        throw Object.assign(new Error(message), { status });
    }

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned);
}

async function solveQuestion(question) {
    const config = await getConfig();
    const prompt = buildPrompt(question);

    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            let image = null;
            if (question.imageUrl) {
                try {
                    image = await fetchImageAsBase64(question.imageUrl);
                } catch (err) {
                    console.warn('[GFF] Could not fetch question image:', err.message);
                }
            }

            const result = await callGemini(prompt, config, image);

            if (result?.answer === undefined) {
                throw new Error('Response missing "answer" field');
            }

            const skipped = result.answer === SKIP_KEYWORD;
            return { success: true, answer: result.answer, skipped };

        } catch (err) {
            lastError = err;
            console.warn(`[GFF] Attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);

            if (err.status === 429 && err.quotaExhausted) {
                return { success: false, quotaExhausted: true };
            }

            if (err.status === 429) {
                return { success: false, rateLimited: true, waitSeconds: err.waitSeconds ?? 60 };
            }

            if (err.status === 400 || err.status === 403) break;

            if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, 500 * attempt));
            }
        }
    }

    return { success: false, error: lastError?.message ?? 'Unknown error' };
}

const MODEL_EXCLUDE = [
    'embedding',
    'aqa',
    'nano',
    'vision',
];

const MIN_OUTPUT_TOKENS = 1024;

async function fetchAvailableModels(apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`;

    const response = await fetch(url);

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const message = err?.error?.message ?? response.statusText;
        throw Object.assign(new Error(message), { status: response.status });
    }

    const data = await response.json();

    const models = (data.models ?? [])
        .filter(m => {
            const id = (m.name ?? '').toLowerCase();
            const displayName = (m.displayName ?? '').toLowerCase();
            const searchStr = id + ' ' + displayName;

            if (!m.supportedGenerationMethods?.includes('generateContent')) return false;

            if (MODEL_EXCLUDE.some(seg => searchStr.includes(seg))) return false;

            if (!id.includes('gemini')) return false;

            if ((m.outputTokenLimit ?? 0) < MIN_OUTPUT_TOKENS) return false;

            return true;
        })
        .map(m => ({
            id: m.name.replace('models/', ''),
            displayName: m.displayName ?? m.name.replace('models/', ''),
        }))
        .sort((a, b) => {
            const rank = id => {
                if (id.includes('flash')) return 0;
                if (id.includes('pro')) return 1;
                if (id.includes('ultra')) return 2;
                return 3;
            };
            return rank(a.id) - rank(b.id) || a.id.localeCompare(b.id);
        });

    return models;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'SOLVE_QUESTION') {
        solveQuestion(message.question).then(sendResponse);
        return true;
    }

    if (message.type === 'FETCH_MODELS') {
        fetchAvailableModels(message.apiKey)
            .then(models => sendResponse({ success: true, models }))
            .catch(err => sendResponse({ success: false, error: `${err.message} (${err.status ?? 'network error'})` }));
        return true;
    }
});