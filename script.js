// =====================
// グローバルステート
// =====================
const gameState = {
    money: 0,                   // 所持金
    sessionEarnings: 0,         // 今回のセッションで稼いだ金額
    totalProduction: 0,         // 設備による自動生産額（毎分）
    inventory: {},              // 所持設備 { itemId: count }
    upgrades: {                 // アップグレードレベル
        charValue: 0,           // 文字単価レベル (0-5)
        timeLimit: 0            // 制限時間レベル (0-5)
    },
    difficulty: 'easy',         // 現在の難易度
    correctChars: 0,            // 今回のセッションの正解文字数
    totalWords: 0,              // 今回のセッションの完成単語数
    isPlaying: false,           // タイピング中かどうか
    timeRemaining: 60,          // 残り時間（秒）
    maxTime: 60,                // 最大時間（秒）
    energy: 100,                // 工場の電力 0.0〜100.0
    lastProductionTime: Date.now(),
    lastEnergyUpdateTime: Date.now(),
    combo: 0,                   // コンボ数
    isFever: false,             // フィーバーモード中かどうか
    feverEndTime: 0             // フィーバー終了時刻
};

// UI要素の取得
const elements = {
    moneyValue: document.getElementById('moneyValue'),
    timerValue: document.getElementById('timerValue'),
    timerBar: document.getElementById('timerBar'),
    sessionEarnings: document.getElementById('sessionEarnings'),
    charValue: document.getElementById('charValue'),
    productionValue: document.getElementById('productionValue'),
    targetWordJapanese: document.getElementById('targetWordJapanese'),
    targetWord: document.getElementById('targetWord'),
    userInput: document.getElementById('userInput'),
    feedback: document.getElementById('feedback'),
    correctChars: document.getElementById('correctChars'),
    totalWords: document.getElementById('totalWords'),
    startButton: document.getElementById('startButton'),
    typingMode: document.getElementById('typingMode'),
    shopMode: document.getElementById('shopMode'),
    upgradeList: document.getElementById('upgradeList'),
    shopList: document.getElementById('shopList'),
    inventoryList: document.getElementById('inventoryList'),
    openShop: document.getElementById('openShop'),
    backToTyping: document.getElementById('backToTyping'),
    resetButton: document.getElementById('resetButton'),
    particleContainer: document.getElementById('particleContainer'),
    difficultyHard: document.getElementById('difficultyHard'),
    energyBar: document.getElementById('energyBar'),
    energyValueText: document.getElementById('energyValueText')
};

// =====================
// リアルタイム所持金更新
// =====================
// =====================
// リアルタイム所持金・電力更新
// =====================
function getProductionMultiplier() {
    if (gameState.energy >= 80) return 2.0;
    if (gameState.energy >= 20) return 1.0;
    return 0.1;
}

function updateEnergy() {
    const now = Date.now();
    const deltaSeconds = (now - gameState.lastEnergyUpdateTime) / 1000;

    // 毎秒 2% 減少
    gameState.energy = Math.max(0, gameState.energy - (2.0 * deltaSeconds));
    gameState.lastEnergyUpdateTime = now;

    updateEnergyUI();
}

function updateMoneyRealtime() {
    updateEnergy();

    if (gameState.totalProduction > 0) {
        const now = Date.now();
        const deltaSeconds = (now - gameState.lastProductionTime) / 1000;
        const productionPerSecond = gameState.totalProduction / 60;
        const multiplier = getProductionMultiplier();
        const earned = Math.floor(productionPerSecond * deltaSeconds * multiplier);

        if (earned >= 1) {
            gameState.money += earned;
            gameState.lastProductionTime = now;
            elements.moneyValue.textContent = formatMoney(gameState.money);
        }
    }

    // フィーバー終了チェック
    if (gameState.isFever && Date.now() > gameState.feverEndTime) {
        endFever();
    }

    requestAnimationFrame(updateMoneyRealtime);
}

function startFever() {
    gameState.isFever = true;
    gameState.feverEndTime = Date.now() + 10000; // 10秒間
    document.body.classList.add('fever-mode');
    elements.feedback.textContent = '🔥 FEVER MODE!!! 🔥';
    elements.feedback.style.color = '#ff00ff';
}

function endFever() {
    gameState.isFever = false;
    document.body.classList.remove('fever-mode');
    elements.feedback.textContent = 'Fever終了';
}

// =====================
// 数値フォーマット
// =====================
function formatMoney(value) {
    if (value >= 100000000) {
        return (value / 100000000).toFixed(1) + '億円';
    } else if (value >= 10000) {
        return (value / 10000).toFixed(1) + '万円';
    }
    return value.toLocaleString() + '円';
}

// =====================
// アップグレード設定
// =====================
const upgradeConfig = {
    charValue: {
        name: '文字単価アップ',
        icon: '💰',
        maxLevel: 20,
        baseCost: 300,
        costMultiplier: 1.3,
        getEffect: (level) => 10 + (level * 5), // 10, 15, 20, 25, 30... 110
        getDescription: (level) => `${10 + (level * 5)}円/文字 → ${10 + ((level + 1) * 5)}円/文字`
    },
    timeLimit: {
        name: '制限時間延長',
        icon: '⏰',
        maxLevel: 20,
        baseCost: 500,
        costMultiplier: 1.25,
        getEffect: (level) => 60 + (level * 15), // 60, 75, 90, 105... 360
        getDescription: (level) => `${60 + (level * 15)}秒 → ${60 + ((level + 1) * 15)}秒`
    }
};

function getUpgradeCost(upgradeType) {
    const config = upgradeConfig[upgradeType];
    const level = gameState.upgrades[upgradeType];
    return Math.floor(config.baseCost * Math.pow(config.costMultiplier, level));
}

function buyUpgrade(upgradeType) {
    const config = upgradeConfig[upgradeType];
    const currentLevel = gameState.upgrades[upgradeType];

    if (currentLevel >= config.maxLevel) {
        elements.feedback.textContent = '最大レベルです！';
        elements.feedback.style.color = '#ffaa00';
        return;
    }

    const cost = getUpgradeCost(upgradeType);

    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.upgrades[upgradeType]++;

        updateUpgradeDisplay();
        updateUI();
        saveGame();

        elements.feedback.textContent = `${config.icon} ${config.name} レベルアップ！`;
        elements.feedback.style.color = '#00ff88';
    } else {
        elements.feedback.textContent = 'お金が足りません！';
        elements.feedback.style.color = '#ff4444';
    }
}

// =====================
// 難易度設定
// =====================
const difficultyConfig = {
    easy: {
        name: '簡単',
        multiplier: 1.0,
        color: '#00ff88'
    },
    normal: {
        name: '普通',
        multiplier: 1.5,
        color: '#ffaa00'
    },
    hard: {
        name: '難しい',
        multiplier: 2.0,
        color: '#ff4444'
    }
};

function setDifficulty(difficulty) {
    if (gameState.isPlaying) return;

    gameState.difficulty = difficulty;

    document.querySelectorAll('.difficulty-button').forEach(btn => {
        btn.classList.remove('active');
    });
    elements[`difficulty${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`].classList.add('active');

    saveGame();
}

// =====================
// タイピング機能
// =====================

// 日本語ベースの単語リスト
const wordLists = {
    easy: [
        { japanese: '愛', romaji: 'ai' },
        { japanese: '上', romaji: 'ue' },
        { japanese: '家', romaji: 'ie' },
        { japanese: '青い', romaji: 'aoi' },
        { japanese: '甥', romaji: 'oi' },
        { japanese: '会う', romaji: 'au' },
        { japanese: '王', romaji: 'ou' },
        { japanese: 'いいえ', romaji: 'iie' },
        { japanese: '会合', romaji: 'kaigo' },
        { japanese: '多い', romaji: 'ooi' },
        { japanese: '会おう', romaji: 'aou' },
        { japanese: '言う', romaji: 'iu' },
        { japanese: '和え', romaji: 'ae' },
        { japanese: '追う', romaji: 'ou' },
        { japanese: '愛想', romaji: 'aiso' },
        { japanese: '赤', romaji: 'aka' },
        { japanese: '傘', romaji: 'kasa' },
        { japanese: '朝', romaji: 'asa' },
        { japanese: '足', romaji: 'asi' },
        { japanese: 'そこ', romaji: 'soko' },
        { japanese: '寿司', romaji: 'sushi' },
        { japanese: '聞く', romaji: 'kiku' },
        { japanese: '世界', romaji: 'sekai' },
        { japanese: '青', romaji: 'ao' },
        { japanese: '硫黄', romaji: 'iou' },
        { japanese: 'イカ', romaji: 'ika' },
        { japanese: '菊', romaji: 'kiku' },
        { japanese: '腰', romaji: 'kosi' },
        { japanese: '過去', romaji: 'kako' },
        { japanese: '刺し', romaji: 'sasi' },
        { japanese: '指数', romaji: 'sisu' },
        { japanese: '菓子', romaji: 'kasi' },
        { japanese: '坂', romaji: 'saka' },
        { japanese: '四季', romaji: 'siki' },
        { japanese: '嘘', romaji: 'uso' },
        { japanese: '基礎', romaji: 'kiso' },
        { japanese: '草', romaji: 'kusa' },
        { japanese: '消す', romaji: 'kesu' },
        { japanese: '操作', romaji: 'sousa' },
        { japanese: '秋', romaji: 'aki' },
        { japanese: '好き', romaji: 'suki' },
        { japanese: '椅子', romaji: 'isu' },
        { japanese: '牛', romaji: 'usi' },
        { japanese: '駅', romaji: 'eki' },
        { japanese: '池', romaji: 'ike' },
        { japanese: '桶', romaji: 'oke' },
        { japanese: '貝', romaji: 'kai' },
        { japanese: '柿', romaji: 'kaki' },
        { japanese: '影', romaji: 'kage' },
        { japanese: '貸し', romaji: 'kasi' },
        { japanese: '茎', romaji: 'kuki' },
        { japanese: '苔', romaji: 'koke' },
        { japanese: '越し', romaji: 'kosi' },
        { japanese: '柵', romaji: 'saku' },
        { japanese: '鹿', romaji: 'sika' },
        { japanese: '式', romaji: 'siki' },
        { japanese: '敷く', romaji: 'siku' },
        { japanese: '潮', romaji: 'sio' },
        { japanese: '煤', romaji: 'susu' },
        { japanese: '裾', romaji: 'suso' },
        { japanese: '席', romaji: 'seki' },
        { japanese: '底', romaji: 'soko' },
        { japanese: '組織', romaji: 'sosiki' },
        { japanese: '倉庫', romaji: 'souko' }
    ],
    normal: [], // 難易度はEasyのみとする指示と解釈（必要なら後で追加）
    hard: []
};

// ローマ字変換マップ（完全対応）
const romajiMap = {
    'し': ['si', 'shi', 'ci'],
    'ち': ['ti', 'chi'],
    'つ': ['tu', 'tsu'],
    'ふ': ['hu', 'fu'],
    'じ': ['zi', 'ji'],
    'しゃ': ['sya', 'sha', 'shixya'],
    'しゅ': ['syu', 'shu', 'shixyu'],
    'しょ': ['syo', 'sho', 'shixyo'],
    'ちゃ': ['tya', 'cha', 'chixya', 'cya'],
    'ちゅ': ['tyu', 'chu', 'chixyu', 'cyu'],
    'ちょ': ['tyo', 'cho', 'chixyo', 'cyo'],
    'じゃ': ['ja', 'jya', 'zya', 'jixya', 'zixya'],
    'じゅ': ['ju', 'jyu', 'zyu', 'jixyu', 'zixyu'],
    'じょ': ['jo', 'jyo', 'zyo', 'jixyo', 'zixyo'],
    'ん': ['nn', 'n']
};

// タイピングステート
const typingState = {
    currentWord: null,
    currentInput: '',
    currentRomajiPatterns: [],
    currentCharIndex: 0,
    possibleInputs: []
};

// 新しい単語を設定
function setNewWord() {
    const words = wordLists[gameState.difficulty];
    const randomWord = words[Math.floor(Math.random() * words.length)];

    typingState.currentWord = randomWord;
    typingState.currentInput = '';
    typingState.currentCharIndex = 0;
    typingState.possibleInputs = generatePossibleInputs(randomWord.romaji);

    elements.targetWordJapanese.textContent = randomWord.japanese;
    elements.targetWord.textContent = randomWord.romaji;
    elements.userInput.textContent = '';
    elements.feedback.textContent = '';
}

// 可能な入力パターンを生成
function generatePossibleInputs(romaji) {
    // 基本的には入力されたromajiをそのまま使用
    return [romaji];
}

// 1文字正解時の報酬を計算
function getCharValue() {
    const baseValue = upgradeConfig.charValue.getEffect(gameState.upgrades.charValue);
    const multiplier = difficultyConfig[gameState.difficulty].multiplier;
    return Math.floor(baseValue * multiplier);
}

// 1文字入力を処理
function handleChar(char) {
    const targetRomaji = typingState.currentWord.romaji;
    const newInput = typingState.currentInput + char;

    // 入力が正しいかチェック（前方一致）
    if (targetRomaji.startsWith(newInput)) {
        // 正解！
        typingState.currentInput = newInput;

        // お金獲得・電力回復
        const charValue = getCharValue();
        gameState.money += charValue;
        gameState.sessionEarnings += charValue;
        gameState.correctChars++;

        // 電力回復 (+0.5%)
        gameState.energy = Math.min(100, gameState.energy + 0.5);
        updateEnergyUI();

        // フィードバック
        elements.feedback.textContent = `+${charValue}円！`;
        elements.feedback.style.color = difficultyConfig[gameState.difficulty].color;
        elements.userInput.textContent = typingState.currentInput;

        // 所持金をリアルタイム更新
        elements.moneyValue.textContent = formatMoney(gameState.money);

        // パーティクル
        createParticle(window.innerWidth / 2, window.innerHeight / 2, '💰');

        // 単語完成チェック
        if (typingState.currentInput === targetRomaji) {
            gameState.totalWords++;
            const bonus = Math.floor(charValue * 2);
            elements.feedback.textContent = `単語完成！ +${bonus}円ボーナス！`;

            // ボーナスも即座に加算
            gameState.money += bonus;
            gameState.sessionEarnings += bonus;
            elements.moneyValue.textContent = formatMoney(gameState.money);

            // 次の単語へ
            setTimeout(() => {
                setNewWord();
            }, 200);
        }

        updateSessionUI();
    } else {
        // ミス！
        gameState.combo = 0;
        elements.feedback.textContent = 'ミス！コンボ途切れた！';
        elements.feedback.style.color = '#ff4444';
    }
}

// キーボード入力のハンドリング
function handleKeyPress(event) {
    if (!gameState.isPlaying) return;

    // 特殊キーは無視
    if (event.key.length > 1) return;

    event.preventDefault();

    // 英数字と-(ハイフン)を受け付け
    if (!/^[a-z]$/.test(event.key.toLowerCase())) {
        return;
    }

    handleChar(event.key.toLowerCase());
}

// =====================
// タイマー機能
// =====================
let timerInterval = null;

function startTimer() {
    gameState.maxTime = upgradeConfig.timeLimit.getEffect(gameState.upgrades.timeLimit);
    gameState.timeRemaining = gameState.maxTime;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        gameState.timeRemaining--;
        updateTimerDisplay();

        if (gameState.timeRemaining <= 0) {
            endSession();
        }
    }, 1000);
}

function updateTimerDisplay() {
    elements.timerValue.textContent = gameState.timeRemaining + '秒';

    const percentage = (gameState.timeRemaining / gameState.maxTime) * 100;
    elements.timerBar.style.width = percentage + '%';

    elements.timerValue.classList.remove('warning', 'danger');
    elements.timerBar.classList.remove('warning', 'danger');

    if (gameState.timeRemaining <= 10) {
        elements.timerValue.classList.add('danger');
        elements.timerBar.classList.add('danger');
    } else if (gameState.timeRemaining <= gameState.maxTime * 0.3) {
        elements.timerValue.classList.add('warning');
        elements.timerBar.classList.add('warning');
    }
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// =====================
// セッション管理
// =====================
function startSession() {
    gameState.isPlaying = true;
    gameState.sessionEarnings = 0; // ゼロからスタート
    gameState.correctChars = 0;
    gameState.totalWords = 0;

    elements.startButton.textContent = 'タイピング中...';
    elements.startButton.disabled = true;
    elements.feedback.textContent = 'がんばって！';
    elements.feedback.style.color = '#00ff88';

    document.querySelectorAll('.difficulty-button').forEach(btn => {
        btn.disabled = true;
    });

    setNewWord();
    startTimer();
    updateSessionUI();
}

function endSession() {
    gameState.isPlaying = false;
    stopTimer();

    // 自動生産分を加算
    const productionBonus = gameState.totalProduction;
    gameState.money += productionBonus;
    gameState.sessionEarnings += productionBonus;

    elements.startButton.textContent = 'タイピング開始！';
    elements.startButton.disabled = false;
    elements.targetWordJapanese.textContent = 'お疲れ様でした！';
    elements.targetWord.textContent = '';
    elements.userInput.textContent = '';
    elements.feedback.textContent = `${formatMoney(gameState.sessionEarnings)} 獲得！`;
    elements.feedback.style.color = '#ffaa00';

    document.querySelectorAll('.difficulty-button').forEach(btn => {
        btn.disabled = false;
    });

    saveGame();
    updateUI();

    setTimeout(() => {
        openShop();
    }, 1500);
}

// =====================
// ショップシステム
// =====================

const gachaItems = {
    N: [
        { id: 'n1', name: 'タワシロボ', emoji: '🤖', production: 100, rarity: 'N' },
        { id: 'n2', name: 'おにぎりマシン', emoji: '🍙', production: 150, rarity: 'N' }
    ],
    R: [
        { id: 'r1', name: 'ラーメンポット', emoji: '🍜', production: 500, rarity: 'R' },
        { id: 'r2', name: 'お掃除ドローン', emoji: '🧹', production: 750, rarity: 'R' }
    ],
    SR: [
        { id: 'sr1', name: '寿司製造機', emoji: '🍣', production: 2500, rarity: 'SR' },
        { id: 'sr2', name: '自動配膳機', emoji: '🍽️', production: 3500, rarity: 'SR' }
    ],
    SSR: [
        { id: 'ssr1', name: 'ケーキ工場', emoji: '🍰', production: 12000, rarity: 'SSR' },
        { id: 'ssr2', name: '超高速コンベア', rarity: 'SSR', emoji: '⚡', production: 15000 }
    ],
    UR: [
        { id: 'ur1', name: '銀河寿司工場', emoji: '🌌', production: 100000, rarity: 'UR' }
    ]
};

const gachaProbabilities = {
    UR: 0.01,
    SSR: 0.04,
    SR: 0.15,
    R: 0.30,
    N: 0.50
};

function getGachaCost() {
    // 基礎コスト 1000 または 生産額の 100倍
    const baseCost = 1000;
    const productionCost = gameState.totalProduction * 60; // 1分間の生産額
    return Math.max(baseCost, productionCost);
}

function spinGacha() {
    const cost = getGachaCost();

    if (gameState.money < cost) {
        elements.feedback.textContent = 'お金が足りません！';
        elements.feedback.style.color = '#ff4444';
        return;
    }

    gameState.money -= cost;
    updateUI();

    // ガチャ演出
    const resultArea = document.getElementById('gachaResultArea');
    resultArea.innerHTML = '<div class="gacha-animation">ガチャを回しています... 🎁</div>';

    setTimeout(() => {
        const rand = Math.random();
        let rarity = 'N';
        let cumulative = 0;

        for (const [r, prob] of Object.entries(gachaProbabilities)) {
            cumulative += prob;
            if (rand < cumulative) {
                rarity = r;
                break;
            }
        }

        const items = gachaItems[rarity];
        const item = items[Math.floor(Math.random() * items.length)];

        // インベントリに追加
        gameState.inventory[item.id] = (gameState.inventory[item.id] || 0) + 1;
        recalculateTotalProduction();
        updateUI();
        saveGame();

        // 結果表示
        resultArea.innerHTML = `
            <div class="gacha-result-card ${item.rarity.toLowerCase()}">
                <div class="rarity-badge">${item.rarity}</div>
                <div class="result-emoji">${item.emoji}</div>
                <div class="result-name">${item.name}</div>
                <div class="result-production">+${formatMoney(item.production)}/分</div>
            </div>
        `;

        elements.feedback.textContent = `${item.rarity} ${item.name} をゲット！`;
        elements.feedback.style.color = '#00ff88';
    }, 1000);
}

function recalculateTotalProduction() {
    gameState.totalProduction = 0;
    const allItems = Object.values(gachaItems).flat();
    for (let item of allItems) {
        const count = gameState.inventory[item.id] || 0;
        gameState.totalProduction += item.production * count;
    }
}

function openShop() {
    elements.typingMode.classList.add('hidden');
    elements.shopMode.classList.remove('hidden');
    updateUpgradeDisplay();
    updateShopDisplay();
}

function closeShop() {
    elements.shopMode.classList.add('hidden');
    elements.typingMode.classList.remove('hidden');
}

function updateUpgradeDisplay() {
    elements.upgradeList.innerHTML = Object.keys(upgradeConfig).map(upgradeType => {
        const config = upgradeConfig[upgradeType];
        const currentLevel = gameState.upgrades[upgradeType];
        const isMaxed = currentLevel >= config.maxLevel;
        const cost = isMaxed ? 0 : getUpgradeCost(upgradeType);
        const canBuy = !isMaxed && gameState.money >= cost;

        return `
            <div class="upgrade-item ${isMaxed ? 'maxed' : ''}">
                <div class="upgrade-item-icon">${config.icon}</div>
                <div class="upgrade-item-name">${config.name}</div>
                <div class="upgrade-item-level">レベル ${currentLevel}/${config.maxLevel}</div>
                <div class="upgrade-item-effect">${isMaxed ? '最大レベル！' : config.getDescription(currentLevel)}</div>
                ${!isMaxed ? `
                    <div class="upgrade-item-cost">💰 ${formatMoney(cost)}</div>
                    <button class="buy-button" onclick="buyUpgrade('${upgradeType}')" ${canBuy ? '' : 'disabled'}>
                        アップグレード
                    </button>
                ` : '<div style="color: #ffaa00; font-weight: bold;">完成！</div>'}
            </div>
        `;
    }).join('');
}

function updateShopDisplay() {
    const cost = getGachaCost();
    const canSpin = gameState.money >= cost;

    elements.shopList.innerHTML = `
        <div class="gacha-container">
            <div class="gacha-description">ガチャを回して設備をゲット！レア度が高いほど生産力アップ！</div>
            <div class="gacha-cost">1回: 💰 ${formatMoney(cost)}</div>
            <button class="gacha-button" onclick="spinGacha()" ${canSpin ? '' : 'disabled'}>
                ガチャを回す！ 🎁
            </button>
            <div id="gachaResultArea" class="gacha-result-area"></div>
        </div>
    `;
}

// =====================
// UI更新関数
// =====================
function updateUI() {
    elements.moneyValue.textContent = formatMoney(gameState.money);
    elements.charValue.textContent = getCharValue() + '円/文字';
    elements.productionValue.textContent = formatMoney(gameState.totalProduction) + '/分';
    updateInventoryDisplay();
}

function updateSessionUI() {
    elements.moneyValue.textContent = formatMoney(gameState.money);
    elements.sessionEarnings.textContent = formatMoney(gameState.sessionEarnings);
    elements.correctChars.textContent = gameState.correctChars;
    elements.totalWords.textContent = gameState.totalWords;
}

function updateInventoryDisplay() {
    const allItems = Object.values(gachaItems).flat();
    const ownedItems = allItems.filter(item => (gameState.inventory[item.id] || 0) > 0);

    if (ownedItems.length === 0) {
        elements.inventoryList.innerHTML = '<div class="inventory-empty">まだ設備がありません</div>';
        return;
    }

    elements.inventoryList.innerHTML = ownedItems.map(item => {
        const count = gameState.inventory[item.id];
        const totalProduction = item.production * count;

        return `
            <div class="inventory-item ${item.rarity.toLowerCase()}">
                <div class="item-info">
                    <div class="rarity-badge-mini">${item.rarity}</div>
                    <div class="item-emoji">${item.emoji}</div>
                    <div class="item-details">
                        <div class="item-name">${item.name}</div>
                        <div class="item-count">×${count}</div>
                    </div>
                </div>
                <div class="item-production">${formatMoney(totalProduction)}/分</div>
            </div>
        `;
    }).join('');
}

function updateEnergyUI() {
    if (!elements.energyBar) return;

    const percentage = gameState.energy;
    elements.energyBar.style.width = percentage + '%';
    elements.energyValueText.textContent = Math.floor(percentage) + '%';

    // 色の変更
    elements.energyBar.classList.remove('overdrive', 'normal', 'low');
    if (percentage >= 80) {
        elements.energyBar.classList.add('overdrive');
    } else if (percentage >= 20) {
        elements.energyBar.classList.add('normal');
    } else {
        elements.energyBar.classList.add('low');
    }
}

// =====================
// パーティクル演出
// =====================
function createParticle(x, y, emoji) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.textContent = emoji;
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';

    elements.particleContainer.appendChild(particle);

    setTimeout(() => {
        particle.remove();
    }, 1000);
}

// =====================
// リセット機能
// =====================
function resetGame() {
    if (confirm('本当にゲームをリセットしますか？\n全てのデータが削除されます。')) {
        localStorage.removeItem('sushiTyperFactory');
        location.reload();
    }
}

// =====================
// セーブ・ロード機能
// =====================
function saveGame() {
    try {
        const saveData = {
            money: gameState.money,
            inventory: gameState.inventory,
            upgrades: gameState.upgrades,
            difficulty: gameState.difficulty,
            totalProduction: gameState.totalProduction,
            energy: gameState.energy
        };

        localStorage.setItem('sushiTyperFactory', JSON.stringify(saveData));
        console.log('💾 ゲームを保存しました');
    } catch (error) {
        console.error('セーブに失敗しました:', error);
    }
}

function loadGame() {
    try {
        const saveDataStr = localStorage.getItem('sushiTyperFactory');
        if (!saveDataStr) {
            console.log('新規ゲームを開始します');
            return false;
        }

        const saveData = JSON.parse(saveDataStr);
        gameState.money = saveData.money || 0;
        gameState.inventory = saveData.inventory || {};
        gameState.upgrades = saveData.upgrades || { charValue: 0, timeLimit: 0 };
        gameState.difficulty = saveData.difficulty || 'easy';
        gameState.energy = saveData.energy !== undefined ? saveData.energy : 100;
        recalculateTotalProduction();

        console.log('📂 セーブデータをロードしました');
        return true;
    } catch (error) {
        console.error('ロードに失敗しました:', error);
        return false;
    }
}

// =====================
// 初期化
// =====================
function init() {
    console.log('🍣 Sushi Typer Factory 起動!');

    loadGame();

    updateUI();
    setDifficulty(gameState.difficulty);
    elements.targetWordJapanese.textContent = '「タイピング開始！」を押してね';
    elements.targetWord.textContent = '';

    elements.startButton.addEventListener('click', startSession);
    elements.openShop.addEventListener('click', openShop);
    elements.backToTyping.addEventListener('click', closeShop);
    elements.resetButton.addEventListener('click', resetGame);
    elements.difficultyEasy.addEventListener('click', () => setDifficulty('easy'));
    elements.difficultyNormal.addEventListener('click', () => setDifficulty('normal'));
    elements.difficultyHard.addEventListener('click', () => setDifficulty('hard'));
    window.addEventListener('keydown', handleKeyPress);

    // リアルタイム所持金更新開始
    updateMoneyRealtime();

    console.log('✅ 初期化完了！');
}

// グローバル関数として公開
window.spinGacha = spinGacha;
window.buyUpgrade = buyUpgrade;

// ページ読み込み後に初期化
window.addEventListener('DOMContentLoaded', init);
