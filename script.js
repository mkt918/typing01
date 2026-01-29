// =====================
// グローバルステート
// =====================
const gameState = {
    money: 0,                   // 所持金
    sessionEarnings: 0,         // 今回のセッションで稼いだ金額
    totalProduction: 0,         // 設備による自動生産額（毎分）
    inventory: {},              // 所持設備 { itemId: count }
    correctChars: 0,            // 今回のセッションの正解文字数
    totalWords: 0,              // 今回のセッションの完成単語数
    isPlaying: false,           // タイピング中かどうか
    timeRemaining: 60           // 残り時間（秒）
};

// UI要素の取得
const elements = {
    moneyValue: document.getElementById('moneyValue'),
    timerValue: document.getElementById('timerValue'),
    sessionEarnings: document.getElementById('sessionEarnings'),
    productionValue: document.getElementById('productionValue'),
    targetWord: document.getElementById('targetWord'),
    userInput: document.getElementById('userInput'),
    feedback: document.getElementById('feedback'),
    correctChars: document.getElementById('correctChars'),
    totalWords: document.getElementById('totalWords'),
    startButton: document.getElementById('startButton'),
    typingMode: document.getElementById('typingMode'),
    shopMode: document.getElementById('shopMode'),
    shopList: document.getElementById('shopList'),
    inventoryList: document.getElementById('inventoryList'),
    openShop: document.getElementById('openShop'),
    backToTyping: document.getElementById('backToTyping'),
    particleContainer: document.getElementById('particleContainer')
};

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
// タイピング機能
// =====================

// 初心者向けの簡単な単語リスト
const wordList = [
    'a', 'i', 'u', 'e', 'o',
    'ka', 'ki', 'ku', 'ke', 'ko',
    'sa', 'si', 'su', 'se', 'so',
    'ta', 'ti', 'tu', 'te', 'to',
    'na', 'ni', 'nu', 'ne', 'no',
    'ha', 'hi', 'hu', 'he', 'ho',
    'ma', 'mi', 'mu', 'me', 'mo',
    'ya', 'yu', 'yo',
    'ra', 'ri', 'ru', 're', 'ro',
    'wa', 'wo', 'nn',
    'neko', 'inu', 'sushi', 'ramen',
    'kasa', 'kame', 'sakana', 'hana'
];

// タイピングステート
const typingState = {
    currentWord: null,
    currentInput: '',
    currentCharIndex: 0
};

// 新しい単語を設定
function setNewWord() {
    const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
    typingState.currentWord = randomWord;
    typingState.currentInput = '';
    typingState.currentCharIndex = 0;

    elements.targetWord.textContent = randomWord;
    elements.userInput.textContent = '';
    elements.feedback.textContent = '';
}

// 1文字正解時の報酬
const MONEY_PER_CHAR = 10;

// 1文字入力を処理
function handleChar(char) {
    const target = typingState.currentWord[typingState.currentCharIndex];

    if (char === target) {
        // 正解！
        typingState.currentInput += char;
        typingState.currentCharIndex++;

        // お金を獲得
        gameState.sessionEarnings += MONEY_PER_CHAR;
        gameState.correctChars++;

        // フィードバック
        elements.feedback.textContent = `+${MONEY_PER_CHAR}円！`;
        elements.feedback.style.color = '#00ff88';

        // パーティクル
        createParticle(window.innerWidth / 2, window.innerHeight / 2, '💰');

        // 単語完成チェック
        if (typingState.currentCharIndex >= typingState.currentWord.length) {
            gameState.totalWords++;
            elements.feedback.textContent = `単語完成！ +${MONEY_PER_CHAR}円ボーナス！`;
            gameState.sessionEarnings += MONEY_PER_CHAR;

            // 次の単語へ
            setTimeout(() => {
                setNewWord();
            }, 200);
        } else {
            elements.userInput.textContent = typingState.currentInput;
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

    // 英数字のみ受け付け
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
    gameState.timeRemaining = 60;
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

    // 色変更
    elements.timerValue.classList.remove('warning', 'danger');
    if (gameState.timeRemaining <= 10) {
        elements.timerValue.classList.add('danger');
    } else if (gameState.timeRemaining <= 30) {
        elements.timerValue.classList.add('warning');
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
    // セッション初期化
    gameState.isPlaying = true;
    gameState.sessionEarnings = gameState.totalProduction; // 自動生産分を追加
    gameState.correctChars = 0;
    gameState.totalWords = 0;

    // UI更新
    elements.startButton.textContent = 'タイピング中...';
    elements.startButton.disabled = true;
    elements.feedback.textContent = 'がんばって！';
    elements.feedback.style.color = '#00ff88';

    // タイピング開始
    setNewWord();
    startTimer();
    updateSessionUI();
}

function endSession() {
    // セッション終了
    gameState.isPlaying = false;
    stopTimer();

    // お金を加算
    gameState.money += gameState.sessionEarnings;

    // UI更新
    elements.startButton.textContent = 'タイピング開始！';
    elements.startButton.disabled = false;
    elements.targetWord.textContent = 'お疲れ様でした！';
    elements.userInput.textContent = '';
    elements.feedback.textContent = `${formatMoney(gameState.sessionEarnings)} 獲得！`;
    elements.feedback.style.color = '#ffaa00';

    // 保存
    saveGame();
    updateUI();

    // ショップを自動的に開く
    setTimeout(() => {
        openShop();
    }, 1500);
}

// =====================
// ショップシステム
// =====================

// ショップアイテムの定義
const shopItems = [
    { id: 'item1', name: 'おにぎりマシン', emoji: '🍙', production: 50, baseCost: 500 },
    { id: 'item2', name: 'ラーメンポット', emoji: '🍜', production: 200, baseCost: 2000 },
    { id: 'item3', name: '寿司工場', emoji: '🍣', production: 800, baseCost: 8000 },
    { id: 'item4', name: 'ケーキオーブン', emoji: '🍰', production: 3000, baseCost: 30000 },
    { id: 'item5', name: 'ロケットプラント', emoji: '🚀', production: 12000, baseCost: 120000 },
    { id: 'item6', name: '銀河工場', emoji: '🌌', production: 50000, baseCost: 500000 }
];

// アイテムのコストを計算（所有数に応じて上昇）
function getItemCost(item) {
    const owned = gameState.inventory[item.id] || 0;
    return Math.floor(item.baseCost * Math.pow(1.15, owned));
}

// アイテムを購入
function buyItem(itemId) {
    const item = shopItems.find(i => i.id === itemId);
    if (!item) return;

    const cost = getItemCost(item);

    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.inventory[itemId] = (gameState.inventory[itemId] || 0) + 1;

        // 総生産額を再計算
        recalculateTotalProduction();

        // UI更新
        updateShopDisplay();
        updateUI();
        saveGame();

        // フィードバック
        elements.feedback.textContent = `${item.emoji} ${item.name} を購入！`;
        elements.feedback.style.color = '#00ff88';
    } else {
        elements.feedback.textContent = 'お金が足りません！';
        elements.feedback.style.color = '#ff4444';
    }
}

// 総生産額を再計算
function recalculateTotalProduction() {
    gameState.totalProduction = 0;
    for (let item of shopItems) {
        const count = gameState.inventory[item.id] || 0;
        gameState.totalProduction += item.production * count;
    }
}

// ショップを開く
function openShop() {
    elements.typingMode.classList.add('hidden');
    elements.shopMode.classList.remove('hidden');
    updateShopDisplay();
}

// ショップを閉じる
function closeShop() {
    elements.shopMode.classList.add('hidden');
    elements.typingMode.classList.remove('hidden');
}

// ショップ表示を更新
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
// セーブ・ロード機能
// =====================
function saveGame() {
    try {
        const saveData = {
            money: gameState.money,
            inventory: gameState.inventory,
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

    // セーブデータをロード
    loadGame();

    // UI初期化
    updateUI();
    elements.targetWord.textContent = '「タイピング開始！」を押してね';

    // イベントリスナー
    elements.startButton.addEventListener('click', startSession);
    elements.openShop.addEventListener('click', openShop);
    elements.backToTyping.addEventListener('click', closeShop);
    window.addEventListener('keydown', handleKeyPress);

    console.log('✅ 初期化完了！');
}

// buyItem関数をグローバルに公開
window.buyItem = buyItem;

// ページ読み込み後に初期化
window.addEventListener('DOMContentLoaded', init);
