# Gemini Form Filler

A browser extension for Chromium-based browsers (Chrome, Edge, Opera, etc.) that automatically fills Google Forms using the Google Gemini AI.

> [!WARNING]
> This extension uses an AI model to generate answers. AI makes mistakes — answers may be incorrect, incomplete, or inappropriate. Always review filled answers before submitting. The author takes no responsibility for the results of form submissions made using this extension.

---

## Installation

The extension is available for download from:
- [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/gemini-form-filler/jkbdobafeneimelhcjcamkhmpnlkdmha/)
- [Chrome Web Store](https://chromewebstore.google.com/detail/gemini-form-filler/njegmkogepejmpdpobokahnaogepgdbi/)
- [Opera add-ons](https://addons.opera.com/extensions/details/gemini-form-filler/) (review in progress)

Publication in other extension stores is available on request (Chromium-based browsers only).

You can also use it unpacked:
1. Download or clone this repository
2. Open your browser and navigate to the extensions page:
   - Chrome / Opera: `chrome://extensions`
   - Edge: `edge://extensions`
   - Other Chromium-based browsers: most probably one of the above, but may differ
3. Enable **Developer mode**
4. Click **Load unpacked** and select the repository folder
5. The extension icon will appear in your browser toolbar

> [!TIP]
> It is recommended to use extension stores instead of the source code for a better experience — including stable builds and automatic updates.

---

## Setup

Before using the extension, you need a Google Gemini API key.

### Getting an API key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click **Get API key** and create a new key

### Configuring the extension

1. Click the extension icon in the toolbar to open the popup
2. Paste your API key into the input field
3. Click **Load models**
4. If the key is valid, a dropdown will appear with available models
5. Select the model you want to use for processing forms
6. Your settings are saved automatically

> [!NOTE]
> The model list is refreshed every time you open the popup. If a previously selected model becomes unavailable, you will be prompted to choose a new one.

---

## Usage

1. Open any Google Form in your browser
2. A **Process** button will appear at the top of the form
3. Click **Process** — the extension will process each question one by one
4. Each question gets a [status icon](#status-icons) showing the result
5. Review all filled answers before submitting the form

> [!IMPORTANT]
> Clicking **Process** again will only process questions marked as failed. Already processed, skipped, and prefilled questions will not be touched — prefilled ones can still be processed manually via their own button (see below).

---

## Status icons

| Icon | Status | Meaning |
|:----:|--------|---------|
| ![Pending state icon](states/gff-pending.svg) | **Pending** | Waiting to be processed |
| ![Processing state icon](states/gff-processing.svg) | **Processing** | Currently being processed by Gemini |
| ![Success state icon](states/gff-success.svg) | **Success** | Answer generated and filled in successfully |
| ![Failure state icon](states/gff-failure.svg) | **Failure** | Could not generate an answer after all retry attempts |
| ![Skipped state icon](states/gff-skipped.svg) | **Skipped** | Question was intentionally skipped |
| ![Prefilled state icon](states/gff-prefilled.svg) | **Prefilled** | Question already contains an answer |

Questions are skipped in three cases:
- The question is **personal** (name, email, opinion, personal experience) — Gemini cannot answer on your behalf
- The question is a **file upload** — not supported by the extension
- The question **already contains an answer** — in this case, you can still process it manually using a dedicated button

---

## Rate limits

If you hit the Gemini API rate limit during processing, a banner will appear with a countdown timer. Once the timer expires, click **Retry** to resume from where it stopped.

If your daily or per-minute quota is exhausted, all remaining questions will be marked as failed, and you will be notified with an on-page toast.

---

## Supported question types

The extension understands every standard Google Forms question type: short answer, paragraph, multiple choice, checkboxes, dropdown, linear scale, rating, radio grid, checkbox grid, date, and time.

File upload questions are the one exception — they require a real file from you, so the extension skips them automatically rather than guessing.

---

## Important notes

- **AI is not perfect.** Gemini may provide incorrect, outdated, or fabricated answers. Treat every filled answer as a suggestion, not a fact
- **Answer language.** The extension instructs Gemini to respond in the same language the question is written in
- **The extension only works** on pages matching `https://docs.google.com/forms/*`

---

## Locales

This extension is available in multiple languages via Chromium's built-in `chrome.i18n` API. Currently supported: **English**, **Ukrainian**.

You can and are welcome to translate this extension to the language of your choice if it is not yet supported. To do this:
1. [Fork](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/fork-a-repo) this repository
2. Create a copy of the [English version folder](_locales/en/) inside the [locales](_locales/) folder
3. Rename it to the **appropriate code** from [Chrome's list of supported locales](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales)
4. Open the [messages file](_locales/en/messages.json) of the newly created folder
5. Translate the contents of all **message** keys while preserving other content, including placeholders
6. Update the languages list above
7. Open a [pull request](https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/creating-a-pull-request-from-a-fork) and wait for review

We are grateful for your contributions to the open-source community.

---

## License

This project is licensed under the [MIT License](LICENSE) — you're free to use, copy, modify, and distribute this code, including for commercial purposes, as long as the original copyright notice and license text are included with any copy you distribute.

If you'd like to republish this extension somewhere not listed above, please [start a discussion](https://docs.github.com/en/discussions/collaborating-with-your-community-using-discussions/participating-in-a-discussion) first — MIT permits it, but we'd appreciate the heads-up.