# Aerofolio ✈️
### Aviation-Inspired Full-Stack & Machine Learning Engineering Portfolio
**Edwin Lin** — Software Engineer | Machine Learning & Full-Stack Systems  
*Delta Air Lines Co-op Engineer Alumni*

[![Angular](https://img.shields.io/badge/Angular-22-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![scikit--learn](https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![XGBoost](https://img.shields.io/badge/XGBoost-ML-2B579A?style=for-the-badge)](https://xgboost.ai/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 🛫 Overview

**Aerofolio** is an aviation-themed engineering portfolio engineered with **Angular 22**, **Signals**, **Tailwind CSS**, and **Lottie animations**. Designed with the precision and operational aesthetic of commercial flight operations, it showcases real production machine learning classifiers, full-stack enterprise architectures, and cybersecurity proof-of-concepts developed across Delta Air Lines engineering co-op rotations and academic research.

---

## 🛩️ Featured Engineering Flights (Projects)

### 1. Flight DAL-907: ServiceNow ML Intent Classifier & Operations Hub
- **Domain:** Production Machine Learning / Serverless NLP Triage
- **Core Stack:** Python, scikit-learn (`LinearSVC`), PostgreSQL, AWS Lambda, Angular, SVG
- **Highlights:**
  - Engineered and deployed a high-precision `LinearSVC` NLP classifier with TF-IDF feature extraction capturing operational incident intent across **10,000+ monthly tickets** at **90.7% accuracy** (0.906 F1).
  - Automated continuous daily retraining pipelines validating against dev PostgreSQL before release.
  - Interactive, synthetic live dashboard simulating operational incident ingestion, airport hub breakdowns (ATL, MSP, DTW, SLC, JFK, SEA, BOS), weekly trend analysis, and real-time model confidence scoring.
  - **Live Demo Route:** `/#dashboard`

### 2. Flight DAL-870: ResourceHub Approval Delegation & CI/CD Test Acceleration
- **Domain:** Enterprise Full-Stack / Developer Productivity
- **Core Stack:** Angular 18/22, TypeScript, Playwright, GitLab CI/CD, WCAG AAA Accessibility
- **Highlights:**
  - Architected an approval delegation subsystem resolving strict hierarchy blocks for multi-tier enterprise approval routing.
  - Redesigned and parallelized a 200+ Playwright E2E test suite in GitLab CI/CD, slashing pipeline test duration from **5 hours down to 40 minutes (87% speedup)** while eliminating test flakiness.
  - Redesigned dark-mode UI with high-contrast WCAG AAA compliance.

### 3. Flight ML-770: Dual-Stream Adversarial Discord Phishing Defense
- **Domain:** Cybersecurity & NLP Research Proof of Concept
- **Core Stack:** Python, FastAPI, XGBoost, scikit-learn, SHAP, Angular
- **Highlights:**
  - Privacy-preserving dual-stream ML architecture fusing **3,000 TF-IDF n-grams (Stream A)** with **17 payload heuristics (Stream B)** (Levenshtein distance, Shannon entropy, homoglyph counters).
  - Achieved **0.9780 F1** score against adversarial evasions (Cyrillic homoglyphs, markdown URL hiding) where standard AutoMod regex crashed by 37.2%.
  - Real-time CPU inference benchmarked at **1.2 ms**.
  - **Live Demo Route:** `/#discord-demo`

---

## 🛠️ Architecture & Engineering Highlights

- **Modern Angular 22 Signals Architecture:** Zero zone.js overhead using `signal`, `output`, `viewChild`, and `afterNextRender` for deterministic reactivity.
- **Dynamic Lottie Vector Takeoff Overlay:** Custom vector flight loader (`flight-loader.json`) driven by `lottie-web` with event-driven completion hooks and seamless hash-based state synchronization.
- **Aviation Design System:**
  - High-resolution looping flight video hero background with responsive horizontal gradient masking.
  - Interactive SVG World Flight Map with animated global Great Circle routes and hub beacons.
  - Real-time Boarding Pass tickets with tear-off barcode stubs, status badges, and expandable dossiers.
  - Suspended Delta Security Crew Badge card with photo toggle and security hologram shimmer.
- **Zero Third-Party CDN Dependency:** Self-contained bundles ensuring 100% offline, corporate firewall, and VPN compatibility.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or v20.x recommended)
- `npm` (v10+ recommended)

### Installation
```bash
# Clone repository
git clone https://github.com/danvse/Edwin_Lin_Portfolio.git

# Enter project directory
cd Edwin_Lin_Portfolio

# Install dependencies
npm install
```

### Local Development
```bash
# Start local development server with hot-reload
npm start
```
Navigate to `http://localhost:4200/`.

### Production Build
```bash
# Compile optimized production bundle
npm run build
```
Production artifacts will be generated in `dist/aerofolio/browser/`.

---

## 🌐 Deploying to GitHub Pages

This repository includes an automated GitHub Actions deployment workflow at `.github/workflows/deploy.yml`.

### One-Time Setup on GitHub:
1. Push this repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit of Aerofolio"
   git branch -M main
   git remote add origin https://github.com/<your-username>/aerofolio.git
   git push -u origin main
   ```
2. In your repository on GitHub, navigate to:
   **Settings** > **Pages**
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. Every push to `main` will automatically build and publish the live site!

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
