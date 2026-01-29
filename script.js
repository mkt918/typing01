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
    maxTime: 60                 // 最大時間（秒）
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
    difficultyEasy: document.getElementById('difficultyEasy'),
    difficultyNormal: document.getElementById('difficultyNormal'),
    difficultyHard: document.getElementById('difficultyHard')
};

// =====================
// リアルタイム所持金更新
// =====================
let lastProductionTime = Date.now();

function updateMoneyRealtime() {
    if (gameState.totalProduction > 0) {
        const now = Date.now();
        const deltaSeconds = (now - lastProductionTime) / 1000;
        const productionPerSecond = gameState.totalProduction / 60;
        const earned = Math.floor(productionPerSecond * deltaSeconds);

        if (earned >= 1) {
            gameState.money += earned;
            lastProductionTime = now;
            elements.moneyValue.textContent = formatMoney(gameState.money);
        }
    }
    requestAnimationFrame(updateMoneyRealtime);
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
        maxLevel: 5,
        baseCost: 1000,
        costMultiplier: 2.5,
        getEffect: (level) => 10 + (level * 10),
        getDescription: (level) => `${10 + (level * 10)}円/文字 → ${10 + ((level + 1) * 10)}円/文字`
    },
    timeLimit: {
        name: '制限時間延長',
        icon: '⏰',
        maxLevel: 5,
        baseCost: 2000,
        costMultiplier: 2.0,
        getEffect: (level) => 60 + (level * 30),
        getDescription: (level) => `${60 + (level * 30)}秒 → ${60 + ((level + 1) * 30)}秒`
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
        { japanese: '味噌', romaji: 'miso' },
        { japanese: '酒', romaji: 'sake' },
        { japanese: '豆腐', romaji: 'tofu' },
        { japanese: '海苔', romaji: 'nori' },
        { japanese: '梅', romaji: 'ume' },
        { japanese: '豆', romaji: 'mame' },
        { japanese: '米', romaji: 'kome' },
        { japanese: '肉', romaji: 'niku' },
        { japanese: 'イカ', romaji: 'ika' },
        { japanese: 'エビ', romaji: 'ebi' },
        { japanese: '鯖', romaji: 'saba' },
        { japanese: '鯵', romaji: 'aji' },
        { japanese: '鯛', romaji: 'tai' },
        { japanese: '蟹', romaji: 'kani' },
        { japanese: 'タコ', romaji: 'tako' },
        { japanese: '卵', romaji: 'tamago' },
        { japanese: '葱', romaji: 'negi' },
        { japanese: '茄子', romaji: 'nasu' },
        { japanese: '大根', romaji: 'daikon' }
    ],
    normal: [
        { japanese: '寿司', romaji: 'sushi' },
        { japanese: 'ラーメン', romaji: 'ramen' },
        { japanese: 'うどん', romaji: 'udon' },
        { japanese: '蕎麦', romaji: 'soba' },
        { japanese: '天ぷら', romaji: 'tempura' },
        { japanese: '焼き鳥', romaji: 'yakitori' },
        { japanese: 'トンカツ', romaji: 'tonkatsu' },
        { japanese: '唐揚げ', romaji: 'karaage' },
        { japanese: '餃子', romaji: 'gyoza' },
        { japanese: 'お好み焼き', romaji: 'okonomiyaki' },
        { japanese: 'たこ焼き', romaji: 'takoyaki' },
        { japanese: '焼きそば', romaji: 'yakisoba' },
        { japanese: '照り焼き', romaji: 'teriyaki' },
        { japanese: 'すき焼き', romaji: 'sukiyaki' },
        { japanese: 'しゃぶしゃぶ', romaji: 'syabusyabu' },
        { japanese: 'カツ丼', romaji: 'katudon' },
        { japanese: '親子丼', romaji: 'oyakodon' },
        { japanese: '牛丼', romaji: 'gyudon' }
    ],
    hard: [
        { japanese: '茶碗蒸し', romaji: 'tyawanmusi' },
        { japanese: '肉じゃが', romaji: 'nikujaga' },
        { japanese: 'ハンバーグ', romaji: 'hanbagu' },
        { japanese: 'オムライス', romaji: 'omuraisu' },
        { japanese: 'ハヤシライス', romaji: 'hayasiraisu' },
        { japanese: 'カレーライス', romaji: 'kareraisu' },
        { japanese: 'コロッケ', romaji: 'korokke' },
        { japanese: 'メンチカツ', romaji: 'mentikatu' },
        { japanese: 'エビフライ', romaji: 'ebihurai' },
        { japanese: 'アジフライ', romaji: 'ajihurai' },
        { japanese: 'カキフライ', romaji: 'kakihurai' },
        { japanese: '野菜炒め', romaji: 'yasaiitame' },
        { japanese: '豚キムチ', romaji: 'butakimuti' },
        { japanese: '麻婆豆腐', romaji: 'mabodofu' },
        { japanese: 'ホイコーロー', romaji: 'hoikoro' },
        { japanese: '青椒肉絲', romaji: 'tinjaorosu' },
        { japanese: '酢豚', romaji: 'subuta' },
        { japanese: '春巻き', romaji: 'harumaki' }
    ]
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

        // お金を獲得（即座に所持金に加算）
        const charValue = getCharValue();
        gameState.money += charValue;
        gameState.sessionEarnings += charValue;
        gameState.correctChars++;

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
        elements.feedback.textContent = 'ミス！';
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

const shopItems = [
    { id: 'item1', name: 'おにぎりマシン', emoji: '🍙', production: 50, baseCost: 500 },
    { id: 'item2', name: 'ラーメンポット', emoji: '🍜', production: 200, baseCost: 2000 },
    { id: 'item3', name: '寿司工場', emoji: '🍣', production: 800, baseCost: 8000 },
    { id: 'item4', name: 'ケーキオーブン', emoji: '🍰', production: 3000, baseCost: 30000 },
    { id: 'item5', name: 'ロケットプラント', emoji: '🚀', production: 12000, baseCost: 120000 },
    { id: 'item6', name: '銀河工場', emoji: '🌌', production: 50000, baseCost: 500000 }
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
                <div class="shop-item-name">${item.name}</div>
                <div class="shop-item-production">+${formatMoney(item.production)}/分</div>
                <div class="shop-item-cost">💰 ${formatMoney(cost)}</div>
                <div class="shop-item-owned">所持: ${owned}個</div>
                <button class="buy-button" onclick="buyItem('${item.id}')" ${canBuy ? '' : 'disabled'}>
                    購入する
                </button>
            </div>
        `;
    }).join('');
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
    elements.sessionEarnings.textContent = formatMoney(gameState.sessionEarnings);
    elements.correctChars.textContent = gameState.correctChars;
    elements.totalWords.textContent = gameState.totalWords;
}

function updateInventoryDisplay() {
    const ownedItems = shopItems.filter(item => (gameState.inventory[item.id] || 0) > 0);

    if (ownedItems.length === 0) {
        elements.inventoryList.innerHTML = '<div class="inventory-empty">まだ設備がありません</div>';
        return;
    }

    elements.inventoryList.innerHTML = ownedItems.map(item => {
        const count = gameState.inventory[item.id];
        const totalProduction = item.production * count;

        return `
            <div class="inventory-item">
                <div class="item-info">
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
            totalProduction: gameState.totalProduction
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
