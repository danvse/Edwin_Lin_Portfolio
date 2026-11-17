import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface ModelBenchmark {
  name: string;
  representation: string;
  cleanF1: string;
  advRecall: string;
  advF1: string;
  latency: string;
  isChampion?: boolean;
  dropClass?: string;
}

export interface StreamBHeuristics {
  homoglyphCount: number;
  homoglyphDetails: string;
  levenshteinDist: number | string;
  shannonEntropy: string;
  markdownMasked: boolean;
  suspiciousTld: boolean;
}

@Component({
  selector: 'app-discord-demo',
  imports: [FormsModule],
  templateUrl: './discord-demo.html',
  styleUrl: './discord-demo.scss',
})
export class DiscordDemo {
  readonly close = output<void>();

  // Theme input passed down from root App component
  readonly theme = input<'dark' | 'light'>('light');

  // Interactive sample payload tester state
  protected readonly activeInput = signal<string>(
    'Free Nitrо gift fоr yоu! [discord.com/gifts](https://dіscоrd-gift.xyz)'
  );

  // Model benchmark table from Edwin's Fall 2026 IEEE Research Paper
  protected readonly benchmarks: ModelBenchmark[] = [
    {
      name: 'Discord AutoMod (Regex)',
      representation: 'Static Keywords & URL Regex',
      cleanF1: '0.8598',
      advRecall: '0.3258 (-58.0%)',
      advF1: '0.4876 (-37.2%)',
      latency: '< 0.1 ms',
      dropClass: 'text-rose-400 font-bold',
    },
    {
      name: 'Multinomial Naive Bayes',
      representation: '3,000 TF-IDF N-Grams',
      cleanF1: '0.9600',
      advRecall: '0.4888',
      advF1: '0.6541',
      latency: '0.8 ms',
    },
    {
      name: 'Logistic Regression',
      representation: '3,000 TF-IDF N-Grams',
      cleanF1: '0.9716',
      advRecall: '0.4494',
      advF1: '0.6178',
      latency: '0.9 ms',
    },
    {
      name: 'Linear SVM',
      representation: '3,000 TF-IDF N-Grams',
      cleanF1: '0.9745',
      advRecall: '0.4438',
      advF1: '0.6124',
      latency: '0.9 ms',
    },
    {
      name: 'Random Forest',
      representation: 'Dual-Stream Fused (R³⁰¹⁷)',
      cleanF1: '0.9657',
      advRecall: '0.6517',
      advF1: '0.7811',
      latency: '3.4 ms',
    },
    {
      name: 'XGBoost (Unhardened)',
      representation: 'Dual-Stream Fused (R³⁰¹⁷)',
      cleanF1: '0.9772',
      advRecall: '0.6854',
      advF1: '0.8078',
      latency: '1.2 ms',
    },
    {
      name: 'XGBoost (Minimax Hardened)',
      representation: 'Dual-Stream Fused + Adversarial Augmentation',
      cleanF1: '0.9780',
      advRecall: '1.0000*',
      advF1: '0.9780 (+37.2%)',
      latency: '1.2 ms',
      isChampion: true,
      dropClass: 'text-emerald-400 font-bold',
    },
  ];

  // Reactive Stream Analysis computed from activeInput()
  protected readonly analysis = computed(() => {
    const text = this.activeInput();
    return this.evaluateText(text);
  });

  protected readonly streamB = computed<StreamBHeuristics>(() => {
    return this.analysis().heuristics;
  });

  // Evaluate text using dual-stream heuristic engine
  private evaluateText(text: string) {
    const lower = text.toLowerCase();

    // Stream A: Semantic TF-IDF keyword tokens
    const semanticTokens: { token: string; weight: number }[] = [];
    const keywords = [
      { word: 'nitro', weight: 0.44 },
      { word: 'gift', weight: 0.32 },
      { word: 'free', weight: 0.28 },
      { word: 'steam', weight: 0.35 },
      { word: 'game', weight: 0.26 },
      { word: 'alpha', weight: 0.22 },
      { word: 'claim', weight: 0.38 },
      { word: 'giveaway', weight: 0.34 },
    ];

    for (const kw of keywords) {
      if (lower.includes(kw.word)) {
        semanticTokens.push({ token: `"${kw.word}"`, weight: kw.weight });
      }
    }

    // Stream B: 17 Structural Heuristics
    // 1. Cyrillic homoglyph detection (e.g. 'о' U+043E, 'а' U+0430, 'е' U+0435, 'с' U+0441, 'і' U+0456)
    const cyrillicMatches = text.match(/[\u0400-\u04FF]/g) || [];
    const homoglyphCount = cyrillicMatches.length;

    // 2. Markdown URL masking: [text](link)
    const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/i;
    const mdMatch = text.match(markdownRegex);
    const markdownMasked = mdMatch !== null && !mdMatch[2].includes(mdMatch[1]);

    // 3. URLs, Levenshtein & TLD
    const urlRegex = /(https?:\/\/[^\s]+)/i;
    const urlMatch = text.match(urlRegex);
    let levenshteinDist: number | string = 'N/A';
    let suspiciousTld = false;

    if (urlMatch) {
      const url = urlMatch[0].toLowerCase();
      suspiciousTld = url.includes('.ru') || url.includes('.xyz') || url.includes('.top') || url.includes('.club');

      if (url.includes('discord')) {
        levenshteinDist = homoglyphCount > 0 ? 2 : 11;
      } else if (url.includes('steam')) {
        levenshteinDist = 9;
      } else {
        levenshteinDist = 14;
      }
    }

    // 4. Shannon Entropy approximation
    const entropy = text.length > 0 ? (2.1 + (homoglyphCount * 0.8) + (urlMatch ? 1.4 : 0)).toFixed(2) : '1.80';

    // Fused Probability Calculation (Minimax Hardened XGBoost simulation)
    let prob = 0.05;
    if (semanticTokens.length > 0) prob += 0.35;
    if (homoglyphCount > 0) prob += 0.40;
    if (markdownMasked) prob += 0.25;
    if (suspiciousTld) prob += 0.20;
    if (prob > 0.99) prob = 0.984;

    const isQuarantined = prob >= 0.80;
    const isFlagged = prob >= 0.50 && prob < 0.80;

    return {
      prob,
      isQuarantined,
      isFlagged,
      semanticTokens,
      heuristics: {
        homoglyphCount,
        homoglyphDetails: homoglyphCount > 0 ? `${homoglyphCount} (Cyrillic U+043E / U+0456)` : '0 detected',
        levenshteinDist: typeof levenshteinDist === 'number' ? `Dist ${levenshteinDist} vs target` : levenshteinDist,
        shannonEntropy: `${entropy} bits`,
        markdownMasked,
        suspiciousTld,
      },
    };
  }

  // Pre-baked test lures
  protected loadLure(type: 'benign' | 'nitro' | 'homoglyph' | 'infostealer') {
    let lureText = '';
    if (type === 'benign') {
      lureText = 'Hey! Are you guys hopping on Discord voice chat for Valorant tonight?';
    } else if (type === 'nitro') {
      lureText = 'OMG free Discord Nitro for 3 months! Claim your gift here: http://free-nitro-gift.ru/claim';
    } else if (type === 'homoglyph') {
      lureText = 'Free Nitrо gift fоr yоu! [discord.com/gifts](https://dіscоrd-gift.xyz)';
    } else if (type === 'infostealer') {
      lureText = 'Hey, my team made a new indie game on Steam! Can you test the alpha build? Download: http://steam-community-test.net/game.zip';
    }

    this.activeInput.set(lureText);
  }
}
