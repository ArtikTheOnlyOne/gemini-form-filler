const apiKeyInput = document.getElementById('gff-api-key');
const statusText = document.getElementById('gff-status-text');
const modelSelect = document.getElementById('gff-model-select');
const loadBtn = document.getElementById('gff-load-btn');

const STATUS = {
    INITIAL: 'Please insert your Google Gemini API key and press the button below.',
    LOADING: 'Loading…',
    MODEL_GONE: 'The previously selected model is no longer available. Please press Load models and select a new one.',
};

function showStatus(text, modifier = null) {
    statusText.textContent = text;
    statusText.className = 'gff-status-text';
    if (modifier) statusText.classList.add(modifier);
    statusText.hidden = false;
    modelSelect.hidden = true;
}

function showModels(models, selectedModel = null) {
    modelSelect.innerHTML = '';

    for (const id of models) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.text = id;
        modelSelect.appendChild(opt);
    }

    if (selectedModel && models.includes(selectedModel)) {
        modelSelect.value = selectedModel;
    }

    statusText.hidden = true;
    modelSelect.hidden = false;
}

function setLoading(on) {
    loadBtn.disabled = on;
    if (on) showStatus(STATUS.LOADING, 'is-loading');
}

async function loadConfig() {
    const { config } = await chrome.storage.local.get('config');
    return config ?? {};
}

async function saveConfig(patch) {
    const existing = await loadConfig();
    await chrome.storage.local.set({ config: { ...existing, ...patch } });
}

async function fetchModels(apiKey) {
    return chrome.runtime.sendMessage({ type: 'FETCH_MODELS', apiKey });
}

async function loadModels(apiKey, savedModel = null) {
    setLoading(true);

    const response = await fetchModels(apiKey);

    setLoading(false);

    if (!response.success) {
        showStatus(response.error ?? 'Unknown error.', 'is-error');
        return;
    }

    const models = response.models;

    await saveConfig({ apiKey, models });

    if (models.length === 0) {
        showStatus('No supported models found for this key.', 'is-error');
        return;
    }

    if (savedModel && !models.includes(savedModel)) {
        await saveConfig({ model: null });
        showStatus(STATUS.MODEL_GONE, 'is-model-gone');

        showModels(models, null);
        return;
    }

    showModels(models, savedModel);

    if (savedModel && models.includes(savedModel)) {
        await saveConfig({ model: savedModel });
    }
}

modelSelect.addEventListener('change', async () => {
    await saveConfig({ model: modelSelect.value });
});


loadBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        showStatus('Please enter your API key.', 'is-error');
        return;
    }

    await loadModels(apiKey);
});

async function init() {
    const config = await loadConfig();

    if (config.apiKey) {
        apiKeyInput.value = config.apiKey;
    }

    if (!config.apiKey) {
        showStatus(STATUS.INITIAL);
        return;
    }

    await loadModels(config.apiKey, config.model ?? null);
}

init();