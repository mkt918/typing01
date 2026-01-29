// =====================
// グローバルステート
// =====================
const gameState = {
    money: 0,                   // 所持金
    sessionEarnings: 0,         // 今回のセッションで稼いだ金額
    totalProduction: 0,         // 設備による自動生産額（毎分）
    inventory: {},              // 所持設備 { itemId: count }
    upgrades: {                 // アップグレードレベル
        charValue: 0,           // 文字単価レベル
        timeLimit: 0,           // 制限時間レベル
        comboMultiplier: 0,     // フィーバー倍率レベル
        unlockNormal: 0,        // 普通モード解放 (0 or 1)
        unlockHard: 0           // 難しいモード解放 (0 or 1)
    },
    difficulty: 'easy',         // 現在の難易度
    correctChars: 0,            // 今回のセッションの正解文字数
    totalWords: 0,              // 今回のセッションの完成単語数
    isPlaying: false,           // タイピング中かどうか
    timeRemaining: 30,          // 残り時間（秒）
    maxTime: 30,                // 最大時間（秒）
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
    comboDisplay: document.getElementById('comboDisplay'),
    startButton: document.getElementById('startButton'),
    typingMode: document.getElementById('typingMode'),
    shopMode: document.getElementById('shopMode'),
    upgradeList: document.getElementById('upgradeList'),
    shopList: document.getElementById('shopList'),
    inventoryList: document.getElementById('inventoryList'),
    openShop: document.getElementById('openShop'),
    backToTyping: document.getElementById('backToTypingUpper'),
    shopMoneyValue: document.getElementById('shopMoneyValue'),
    resetButton: document.getElementById('resetButton'),
    particleContainer: document.getElementById('particleContainer'),
    difficultyEasy: document.getElementById('difficultyEasy'),
    difficultyNormal: document.getElementById('difficultyNormal'),
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

        // 毎秒の生産額
        const productionPerSecond = gameState.totalProduction;
        const multiplier = getProductionMultiplier();
        const earned = productionPerSecond * deltaSeconds * multiplier;

        if (earned > 0) {
            gameState.money += earned;
            gameState.lastProductionTime = now;
            elements.moneyValue.textContent = formatMoney(Math.floor(gameState.money));
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
    return value.toLocaleString() + '円';
}

// =====================
// アップグレード設定
// =====================
const upgradeConfig = {
    charValue: {
        name: '文字単価アップ',
        icon: '💰',
        maxLevel: 100,
        baseCost: 50,  // 初期コストを引き上げ
        costMultiplier: 1.15,
        getEffect: (level) => 1 + level,
        getDescription: (level) => `${1 + level}円 → ${1 + level + 1}円`
    },
    timeLimit: {
        name: '制限時間延長',
        icon: '⏰',
        maxLevel: 30,
        baseCost: 300,
        costMultiplier: 1.2,
        getEffect: (level) => 30 + (level * 2),
        getDescription: (level) => `${30 + (level * 2)}秒 → ${30 + ((level + 1) * 2)}秒`
    },
    comboMultiplier: {
        name: 'コンボ集中力',
        icon: '🔥',
        maxLevel: 20,
        baseCost: 500,
        costMultiplier: 1.5,
        getEffect: (level) => 2.0 + (level * 0.1),
        getDescription: (level) => `フィーバー倍率 ${(2.0 + level * 0.1).toFixed(1)}倍 → ${(2.0 + (level + 1) * 0.1).toFixed(1)}倍`
    },
    unlockNormal: {
        name: '難易度「普通」解放',
        icon: '🔓',
        maxLevel: 1,
        baseCost: 5000,
        costMultiplier: 1,
        getEffect: (level) => level > 0,
        getDescription: (level) => level > 0 ? '解放済み' : '「普通 (×1.5)」を解放します'
    },
    unlockHard: {
        name: '難易度「難しい」解放',
        icon: '🔓',
        maxLevel: 1,
        baseCost: 10000,
        costMultiplier: 1,
        getEffect: (level) => level > 0,
        getDescription: (level) => level > 0 ? '解放済み' : '「難しい (×2.0)」を解放します'
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

    // 解放チェック
    if (difficulty === 'normal' && !gameState.upgrades.unlockNormal) {
        elements.feedback.textContent = '「普通 (Normal)」を解放するにはショップで購入してください！';
        elements.feedback.style.color = '#ffaa00';
        return;
    }
    if (difficulty === 'hard' && !gameState.upgrades.unlockHard) {
        elements.feedback.textContent = '「難しい (Hard)」を解放するにはショップで購入してください！';
        elements.feedback.style.color = '#ff4444';
        return;
    }

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

// 単語リストは words.js から読み込まれます

// ローマ字変換マップ（完全対応）
const romajiMap = {
    'あ': ['a'], 'い': ['i', 'yi'], 'う': ['u', 'wu'], 'え': ['e', 'ye'], 'お': ['o'],
    'か': ['ka', 'ca'], 'き': ['ki'], 'く': ['ku', 'cu', 'qu'], 'け': ['ke'], 'こ': ['ko', 'co'],
    'さ': ['sa'], 'し': ['si', 'shi', 'ci'], 'す': ['su'], 'せ': ['se', 'ce'], 'そ': ['so'],
    'た': ['ta'], 'ち': ['ti', 'chi'], 'つ': ['tu', 'tsu'], 'て': ['te'], 'と': ['to'],
    'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
    'は': ['ha'], 'ひ': ['hi'], 'ふ': ['hu', 'fu'], 'へ': ['he'], 'ほ': ['ho'],
    'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
    'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
    'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
    'わ': ['wa'], 'を': ['wo'], 'ん': ['nn', 'n', 'xn'],
    'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
    'ざ': ['za'], 'じ': ['zi', 'ji'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
    'だ': ['da'], 'ぢ': ['di'], 'づ': ['du'], 'で': ['de'], 'ど': ['do'],
    'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
    'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],
    'しゃ': ['sya', 'sha', 'sixya', 'shixya'],
    'しゅ': ['syu', 'shu', 'sixyu', 'shixyu'],
    'しょ': ['syo', 'sho', 'sixyo', 'shixyo'],
    'ちゃ': ['tya', 'cha', 'tixya', 'chixya', 'cya'],
    'ちゅ': ['tyu', 'chu', 'tixyu', 'chixyu', 'cyu'],
    'ちょ': ['tyo', 'cho', 'tixyo', 'chixyo', 'cyo'],
    'にゃ': ['nya', 'nixya'], 'にゅ': ['nyu', 'nixyu'], 'にょ': ['nyo', 'nixyo'],
    'ひゃ': ['hya', 'hixya'], 'ひゅ': ['hyu', 'hixyu'], 'ひょ': ['hyo', 'hixyo'],
    'みゃ': ['mya', 'mixya'], 'みゅ': ['myu', 'mixyu'], 'みょ': ['myo', 'mixyo'],
    'りゃ': ['rya', 'rixya'], 'りゅ': ['ryu', 'rixyu'], 'りょ': ['ryo', 'rixyo'],
    'ぎゃ': ['gya', 'gixya'], 'ぎゅ': ['gyu', 'gixyu'], 'ぎょ': ['gyo', 'gixyo'],
    'じゃ': ['ja', 'jya', 'zya', 'jixya', 'zixya'],
    'じゅ': ['ju', 'jyu', 'zyu', 'jixyu', 'zixyu'],
    'じょ': ['jo', 'jyo', 'zyo', 'jixyo', 'zixyo'],
    'びゃ': ['bya', 'bixya'], 'びゅ': ['byu', 'bixyu'], 'びょ': ['byo', 'bixyo'],
    'ぴゃ': ['pya', 'pixya'], 'ぴゅ': ['pyu', 'pixyu'], 'ぴょ': ['pyo', 'pixyo'],
    'ぁ': ['xa', 'la'], 'ぃ': ['xi', 'li'], 'ぅ': ['xu', 'lu', 'xtu', 'ltu'], 'ぇ': ['xe', 'le'], 'ぉ': ['xo', 'lo'],
    'っ': ['xtu', 'ltu', 'xtsu', 'ltsu']
};

// タイピングステート
const typingState = {
    currentWord: null,
    currentInput: '',
    currentRomajiPatterns: [],
    currentCharIndex: 0,
    allPossibleRomaji: [] // 可能な全ローマ字パターンを保持
};

// 新しい単語を設定
function setNewWord() {
    const words = wordLists[gameState.difficulty];
    const randomWord = words[Math.floor(Math.random() * words.length)];

    // 読み（ふりがな）がある場合はそれを利用、無い場合はjapaneseをそのまま利用
    const reading = randomWord.reading || randomWord.japanese;

    typingState.currentWord = {
        ...randomWord,
        reading: reading
    };
    typingState.currentInput = '';

    // 読みから全ての可能なローマ字パターンを生成
    updatePossiblePatternsFromReading(reading);

    elements.targetWordJapanese.textContent = randomWord.japanese;
    // デフォルトで最初のパターンを表示
    elements.targetWord.textContent = typingState.allPossibleRomaji[0];
    elements.userInput.textContent = '';
    elements.feedback.textContent = '';
}

// 読み（ひらがな）から全ての可能なローマ字パターンを作成
function updatePossiblePatternsFromReading(reading) {
    let patterns = [''];
    let i = 0;

    while (i < reading.length) {
        let found = false;
        // 2文字（拗音など）のチェック
        if (i + 1 < reading.length) {
            const twoChars = reading.substring(i, i + 2);
            if (romajiMap[twoChars]) {
                const variants = romajiMap[twoChars];
                let newPatterns = [];
                for (let p of patterns) {
                    for (let v of variants) {
                        newPatterns.push(p + v);
                    }
                }
                patterns = newPatterns;
                i += 2;
                found = true;
            }
        }

        if (!found) {
            const oneChar = reading[i];
            const variants = romajiMap[oneChar] || [oneChar];
            let newPatterns = [];
            for (let p of patterns) {
                for (let v of variants) {
                    newPatterns.push(p + v);
                }
            }
            patterns = newPatterns;
            i++;
        }
    }
    typingState.allPossibleRomaji = patterns;
}


// 1文字正解時の報酬を計算
function getCharValue() {
    const baseValue = upgradeConfig.charValue.getEffect(gameState.upgrades.charValue);
    const multiplier = difficultyConfig[gameState.difficulty].multiplier;
    return Math.floor(baseValue * multiplier);
}

// 1文字入力を処理
// 1文字入力を処理
function handleChar(char) {
    const inputSoFar = typingState.currentInput + char;

    // 現在の入力で始まる可能性のあるローマ字パターンをフィルタリング
    const validPatterns = typingState.allPossibleRomaji.filter(p => p.startsWith(inputSoFar));

    if (validPatterns.length > 0) {
        // 正解！
        typingState.currentInput = inputSoFar;
        gameState.combo++;

        // 代表的な有効なパターンをUIに表示
        typingState.currentWord.romaji = validPatterns[0];
        elements.targetWord.textContent = typingState.currentWord.romaji;

        let charValue = getCharValue();
        if (gameState.isFever) {
            const feverMult = upgradeConfig.comboMultiplier.getEffect(gameState.upgrades.comboMultiplier || 0);
            charValue *= feverMult;
        }

        gameState.money += charValue;
        gameState.sessionEarnings += charValue;
        gameState.correctChars++;

        if (gameState.combo >= 10 && !gameState.isFever) {
            startFever();
        }

        gameState.energy = Math.min(100, gameState.energy + 0.5);
        updateEnergyUI();

        elements.feedback.textContent = `+${Math.floor(charValue)}`;
        elements.comboDisplay.textContent = `${gameState.combo} Combo`;
        elements.userInput.textContent = typingState.currentInput;
        elements.moneyValue.textContent = formatMoney(Math.floor(gameState.money));

        createParticle(window.innerWidth / 2, window.innerHeight / 2, '💰');

        // 単語完成チェック
        if (validPatterns.some(p => p === typingState.currentInput)) {
            gameState.totalWords++;
            const bonus = Math.floor(charValue * 2);
            elements.feedback.textContent = `単語完成! +${bonus}`;

            gameState.money += bonus;
            gameState.sessionEarnings += bonus;
            elements.moneyValue.textContent = formatMoney(Math.floor(gameState.money));

            setTimeout(() => {
                setNewWord();
            }, 200);
        }

        updateSessionUI();
    } else {
        // ミス！
        gameState.combo = 0;
        elements.comboDisplay.textContent = `0 Combo`;
        elements.feedback.textContent = 'MISS!';
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
    gameState.combo = 0;
    if (elements.comboDisplay) elements.comboDisplay.textContent = '0 Combo';
    if (elements.feedback) elements.feedback.textContent = '';

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

const shopItems = [
    { id: 'item1', name: 'タワシロボ', emoji: '🤖', production: 2, baseCost: 500 },
    { id: 'item2', name: 'おにぎりマシン', emoji: '🍙', production: 5, baseCost: 1500 },
    { id: 'item3', name: 'ラーメンポット', emoji: '🍜', production: 15, baseCost: 5000 },
    { id: 'item4', name: '寿司製造機', emoji: '🍣', production: 50, baseCost: 20000 },
    { id: 'item5', name: 'ケーキ工場', emoji: '🍰', production: 200, baseCost: 100000 },
    { id: 'item6', name: '銀河寿司工場', emoji: '🌌', production: 1500, baseCost: 750000 }
];

function getItemCost(item) {
    const owned = gameState.inventory[item.id] || 0;
    return Math.floor(item.baseCost * Math.pow(1.15, owned));
}

function buyItem(itemId) {
    const item = shopItems.find(i => i.id === itemId);
    if (!item) return;

    const cost = getItemCost(item);

    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.inventory[itemId] = (gameState.inventory[itemId] || 0) + 1;

        recalculateTotalProduction();
        updateShopDisplay();
        updateUI();
        saveGame();

        elements.feedback.textContent = `${item.emoji} ${item.name} を購入！`;
        elements.feedback.style.color = '#00ff88';
    } else {
        elements.feedback.textContent = 'お金が足りません！';
        elements.feedback.style.color = '#ff4444';
    }
}

function recalculateTotalProduction() {
    gameState.totalProduction = 0;
    for (let item of shopItems) {
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
    elements.shopList.innerHTML = shopItems.map(item => {
        const cost = getItemCost(item);
        const owned = gameState.inventory[item.id] || 0;
        const canBuy = gameState.money >= cost;

        return `
            <div class="shop-item">
                <div class="shop-item-emoji">${item.emoji}</div>
                <div class="shop-item-details">
                    <div class="shop-item-name">${item.name}</div>
                    <div class="shop-item-production">+${formatMoney(item.production)}/秒 (所持: ${owned})</div>
                </div>
                <button class="buy-button-small" onclick="buyItem('${item.id}')" ${canBuy ? '' : 'disabled'}>
                    💰${formatMoney(cost)}
                </button>
            </div>
        `;
    }).join('');
}

// =====================
// UI更新関数
// =====================
function updateUI() {
    const moneyText = formatMoney(Math.floor(gameState.money));
    elements.moneyValue.textContent = moneyText;
    if (elements.shopMoneyValue) elements.shopMoneyValue.textContent = moneyText;

    elements.charValue.textContent = getCharValue() + '円/文字';
    elements.productionValue.textContent = formatMoney(Math.floor(gameState.totalProduction)) + '/秒';
    updateInventoryDisplay();
}

function updateSessionUI() {
    const moneyText = formatMoney(Math.floor(gameState.money));
    elements.moneyValue.textContent = moneyText;
    if (elements.shopMoneyValue) elements.shopMoneyValue.textContent = moneyText;

    elements.sessionEarnings.textContent = formatMoney(gameState.sessionEarnings);
}

function updateInventoryDisplay() {
    const ownedItems = shopItems.filter(item => (gameState.inventory[item.id] || 0) > 0);

    if (ownedItems.length === 0) {
        elements.inventoryList.innerHTML = '<div class="inventory-empty">設備なし</div>';
        return;
    }

    elements.inventoryList.innerHTML = ownedItems.map(item => {
        const count = gameState.inventory[item.id];
        const totalProduction = item.production * count;

        return `
            <div class="inventory-item-mini">
                <span>${item.emoji} ${item.name} ×${count}</span>
                <span class="item-prod-mini">+${formatMoney(totalProduction)}/秒</span>
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
window.buyItem = buyItem;
window.buyUpgrade = buyUpgrade;

// ページ読み込み後に初期化
window.addEventListener('DOMContentLoaded', init);
