# Local AI

A mobile AI chat application built with Expo, React Native, and QVAC, enabling on-device AI inference without relying entirely on cloud services.

## Features

* 🤖 Local AI model execution
* 📱 Cross-platform mobile app using Expo
* ⚡ Fast on-device inference with QVAC
* 🔒 Enhanced privacy by processing data locally
* 💬 Interactive chat interface
* 🎨 Modern and responsive UI

## Tech Stack

* React Native
* Expo
* TypeScript
* QVAC SDK

## Project Structure

```
.
├── assets/
│   ├── icon.png
│   ├── adaptive-icon.png
│   ├── splash-icon.png
│   └── favicon.png
├── qvac/
│   ├── addons.manifest.json
│   ├── worker.bundle.js
│   └── worker.entry.mjs
├── App.tsx
├── app.json
├── package.json
├── tsconfig.json
└── index.ts
```

## Installation

Clone the repository:

```bash
git clone https://github.com/Bheem014/Local-AI-.git
cd Local-AI-
```

Install dependencies:

```bash
npm install
```

## Running the App

Start the Expo development server:

```bash
npx expo start
```

Run on Android:

```bash
npx expo run:android
```

## Building Android APK

Configure EAS Build:

```bash
npx eas build:configure
```

Create an Android build:

```bash
npx eas build -p android --profile preview
```

## Future Improvements

* Multiple AI model support
* Chat history management
* Voice input and output
* Offline document analysis
* Improved UI/UX
* Performance optimization

## Author

**Bheem Kattimani**

GitHub: https://github.com/Bheem014

## License

This project is for learning and experimentation purposes.
