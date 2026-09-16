const apiKeyInput = document.getElementById("gff-api-key");
const statusText = document.getElementById("gff-status-text");
const modelSelect = document.getElementById("gff-model-select");
const loadBtn = document.getElementById("gff-load-btn");

const STATUS = {
    INITIAL: "Please insert your Google Gemini API key and press the button below.",
    LOADING: "Loading…",
    MODEL_GONE: "The previously selected model is no longer available. Please select a new one.",
};

let savedApiKey = null;
let hasValidModel = false;

function setStatusText(text, modifier = null) {
    if (!text) {
        statusText.hidden = true;
        return;
    }
    statusText.textContent = text;
    statusText.className = "gff-status-text";
    if (modifier) statusText.classList.add(modifier);
    statusText.hidden = false;
}

function setModelOptions(models, selectedModel = null) {
    if (!models) {
        modelSelect.hidden = true;
        return;
    }

    modelSelect.innerHTML = "";
    for (const { id, displayName } of models) {
        const opt = document.createElement("option");
        opt.value = id;
        opt.text = displayName;
        modelSelect.appendChild(opt);
    }

    const ids = models.map(m => m.id);
    if (selectedModel && ids.includes(selectedModel)) {
        modelSelect.value = selectedModel;
    }

    modelSelect.hidden = false;
}

function setLoading(on) {
    loadBtn.disabled = on;
    if (on) {
        setModelOptions(null);
        setStatusText(STATUS.LOADING, "is-loading");
    }
}

function updateButtonVisibility() {
    const keyChanged = apiKeyInput.value.trim() !== (savedApiKey ?? "");
    loadBtn.hidden = !keyChanged && hasValidModel;
}

async function loadConfig() {
    const { config } = await chrome.storage.local.get("config");
    return config ?? {};
}

async function saveConfig(patch) {
    const existing = await loadConfig();
    await chrome.storage.local.set({ config: { ...existing, ...patch } });
}

async function fetchModels(apiKey) {
    return chrome.runtime.sendMessage({ type: "FETCH_MODELS", apiKey });
}

async function loadModels(apiKey, savedModel = null) {
    setLoading(true);

    const response = await fetchModels(apiKey);

    setLoading(false);

    if (!response.success) {
        setStatusText(response.error ?? "Unknown error.", "is-error");
        hasValidModel = false;
        updateButtonVisibility();
        return;
    }

    const models = response.models;

    await saveConfig({ apiKey, models });
    savedApiKey = apiKey;

    if (models.length === 0) {
        setStatusText("No supported models found for this key.", "is-error");
        hasValidModel = false;
        updateButtonVisibility();
        return;
    }

    const ids = models.map(m => m.id);

    if (savedModel && !ids.includes(savedModel)) {
        await saveConfig({ model: null });
        setStatusText(STATUS.MODEL_GONE, "is-model-gone");
        setModelOptions(models, null);
        hasValidModel = false;
        updateButtonVisibility();
        return;
    }

    setStatusText(null);
    setModelOptions(models, savedModel);

    if (savedModel && ids.includes(savedModel)) {
        await saveConfig({ model: savedModel });
        hasValidModel = true;
    } else {
        hasValidModel = false;
    }

    updateButtonVisibility();
}

modelSelect.addEventListener("change", async () => {
    await saveConfig({ model: modelSelect.value });
    hasValidModel = true;
    updateButtonVisibility();
});

apiKeyInput.addEventListener("input", updateButtonVisibility);

loadBtn.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        setStatusText("Please enter your API key.", "is-error");
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
        setStatusText(STATUS.INITIAL);
        updateButtonVisibility();
        return;
    }

    await loadModels(config.apiKey, config.model ?? null);
}

init();