# Contributing

Thank you for your interest in Gemini Form Filler! You can help by reporting bugs, suggesting features, translating the extension into your language, or improving the code.

## Reporting bugs and suggesting features

Please search the existing [issues](https://github.com/ArtikTheOnlyOne/gemini-form-filler/issues) first, then [open a new one](https://github.com/ArtikTheOnlyOne/gemini-form-filler/issues/new/choose) using the matching form. For questions and early-stage ideas, start a [discussion](https://github.com/ArtikTheOnlyOne/gemini-form-filler/discussions) instead.

> [!CAUTION]
> Never post your Gemini API key anywhere. It can appear in logs, screenshots and network captures, so remove it from anything you share.

## Translating the extension

The extension uses the browser's built-in `chrome.i18n` API, so a new language is one folder with one JSON file.

1. [Fork](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/fork-a-repo) this repository
2. Create a copy of the [English version folder](../_locales/en/) inside the [locales](../_locales/) folder
3. Rename it to the **appropriate code** from [Chrome's list of supported locales](https://developer.chrome.com/docs/extensions/reference/api/i18n#locales)
4. Open the [messages file](../_locales/en/messages.json) of the newly created folder
5. Translate the contents of all `message` keys while preserving other content, including placeholders
6. Add the language to the list in the [README](../README.md#locales)
7. Push your changes and open a pull request

If you can, check how the translation looks by switching your browser's display language to the new one.

## Code changes

There is no build step, the repository is the extension.

1. Fork and clone the repository
2. Open the extensions page of your browser (`chrome://extensions`, `edge://extensions` or other), enable **Developer mode**, click **Load unpacked** and select the repository folder
3. After changing the code, reload the extension on the extensions page and refresh the Google Form tab
4. Test the change on a form that contains the affected question types

> [!IMPORTANT]
> Please keep changes focused and follow the existing style: 4 spaces for indentation, double quotes and minimal comments.

## Pull request titles

The repository uses squash merging, so the pull request title becomes the commit message on `main`. Commits inside the pull request do not have to follow any convention.

- Start with a lowercase letter
- Describe what was done in the past tense: `fixed ...`, `added ...`, `changed ...`
- Pull requests that add a language must be titled exactly `added <Language> language support`, with the language name capitalized

> [!NOTE]
> If the title needs changes, you can edit it at any time on the pull request page.

## License

By contributing, you agree that your contribution is licensed under the [Apache License 2.0](../LICENSE), as described in section 5 of the license.