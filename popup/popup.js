const apiKeyInput = document.getElementById("gff-api-key");
const statusText = document.getElementById("gff-status-text");
const modelSelect = document.getElementById("gff-model-select");
const loadBtn = document.getElementById("gff-load-btn");

const STATUS = {
    INITIAL: chrome.i18n.getMessage("statusInitial"),
    LOADING: chrome.i18n.getMessage("statusLoading"),
    MODEL_GONE: chrome.i18n.getMessage("statusModelGone"),
};

function applyI18n() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        el.textContent = chrome.i18n.getMessage(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        el.placeholder = chrome.i18n.getMessage(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
        el.alt = chrome.i18n.getMessage(el.dataset.i18nAlt);
    });
    document.documentElement.lang = chrome.i18n.getUILanguage();
}

applyI18n();

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
        setStatusText(response.error ?? chrome.i18n.getMessage("statusUnknownError"), "is-error");
        hasValidModel = false;
        updateButtonVisibility();
        return;
    }

    const models = response.models;

    await saveConfig({ apiKey, models });
    savedApiKey = apiKey;

    if (models.length === 0) {
        setStatusText(chrome.i18n.getMessage("statusNoModels"), "is-error");
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
    modelSelect.blur();
});

apiKeyInput.addEventListener("input", updateButtonVisibility);

loadBtn.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        setStatusText(chrome.i18n.getMessage("statusEnterKey"), "is-error");
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