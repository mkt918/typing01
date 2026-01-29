// =====================
// グローバルステート
// =====================
const gameState = {
    money: 0n,              // BigInt: 所持金
    energy: 100.0,          // Float: 電力 (0-100)
    totalProduction: 0n,    // BigInt: 毎秒の自動生産額
    clickValue: 100n,       // BigInt: タイピング1回の獲得金額
    inventory: [],          // Array: 所持設備
    highScore: 0,           // Number: 最大WPM
    combo: 0,               // Number: 連続成功回数
    isFever: false          // Boolean: Feverモード
};

// UI要素の取得
const elements = {
    moneyValue: document.getElementById('moneyValue'),
    energyBar: document.getElementById('energyBar'),
    energyText: document.getElementById('energyText'),
    productionValue: document.getElementById('productionValue'),
    wpmValue: document.getElementById('wpmValue'),
    targetWord: document.getElementById('targetWord'),
    userInput: document.getElementById('userInput'),
    feedback: document.getElementById('feedback'),
    comboCounter: document.getElementById('comboCounter'),
    feverMode: document.getElementById('feverMode'),
    gachaButton: document.getElementById('gachaButton'),
    gachaCost: document.getElementById('gachaCost'),
    inventoryList: document.getElementById('inventoryList'),
    particleContainer: document.getElementById('particleContainer')
};

// =====================
// BigInt対応フォーマット関数
// =====================
function formatMoney(value) {
    // BigIntを文字列に変換
    const str = value.toString();

    // 日本の単位
    const units = [
        { value: 68n, name: '無量大数' },
        { value: 64n, name: '不可思議' },
        { value: 60n, name: '那由他' },
        { value: 56n, name: '阿僧祇' },
        { value: 52n, name: '恒河沙' },
        { value: 48n, name: '極' },
        { value: 44n, name: '載' },
        { value: 40n, name: '正' },
        { value: 36n, name: '澗' },
        { value: 32n, name: '溝' },
        { value: 28n, name: '穰' },
        { value: 24n, name: '秭' },
        { value: 20n, name: '垓' },
        { value: 16n, name: '京' },
        { value: 12n, name: '兆' },
        { value: 8n, name: '億' },
        { value: 4n, name: '万' }
    ];

    // 値が0の場合
    if (value === 0n) {
        return '0円';
    }

    // 最大単位を見つける
    for (let unit of units) {
        const divisor = 10n ** unit.value;
        if (value >= divisor) {
            const quotient = value / divisor;
            const remainder = value % divisor;

            // 小数点以下2桁まで表示
            const decimalPart = (Number(remainder) / Number(divisor) * 10000).toFixed(0);
            const decimal = decimalPart.substring(0, 2);

            if (decimal !== '00') {
                return `${quotient}.${decimal}${unit.name}円`;
            } else {
                return `${quotient}${unit.name}円`;
            }
        }
    }

    // 万未満は3桁カンマ区切り
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '円';
}

// =====================
// UI更新関数
// =====================
function updateUI() {
    // 所持金の表示
    elements.moneyValue.textContent = formatMoney(gameState.money);

    // 電力バーの表示
    const energyPercent = Math.max(0, Math.min(100, gameState.energy));
    elements.energyBar.style.width = energyPercent + '%';
    elements.energyText.textContent = energyPercent.toFixed(1) + '%';

    // 電力バーの色変更
    elements.energyBar.classList.remove('low', 'normal');
    if (energyPercent < 20) {
        elements.energyBar.classList.add('low');
    } else if (energyPercent < 80) {
        elements.energyBar.classList.add('normal');
    }

    // 毎秒生産額の表示
    const productionMultiplier = getProductionMultiplier();
    const effectiveProduction = gameState.totalProduction * BigInt(Math.floor(productionMultiplier * 100)) / 100n;
    elements.productionValue.textContent = formatMoney(effectiveProduction) + '/秒';

    // WPMの表示
    elements.wpmValue.textContent = gameState.highScore;

    // コンボの表示
    elements.comboCounter.textContent = `Combo: ${gameState.combo}`;

    // Feverモードの表示
    if (gameState.isFever) {
        elements.feverMode.classList.remove('hidden');
        document.body.classList.add('fever');
    } else {
        elements.feverMode.classList.add('hidden');
        document.body.classList.remove('fever');
    }

    // ガチャコストの表示
    updateGachaCost();

    // インベントリの表示
    updateInventoryDisplay();
}

// =====================
// 電力による生産倍率の計算
// =====================
function getProductionMultiplier() {
    if (gameState.energy >= 80) {
        return 2.0; // Overdrive: 200%
    } else if (gameState.energy >= 20) {
        return 1.0; // Normal: 100%
    } else {
        return 0.1; // Low Power: 10%
    }
}

// =====================
// ガチャコストの更新
// =====================
function updateGachaCost() {
    // 基本コスト: 毎秒生産額の100倍、または最低1000円
    let cost = gameState.totalProduction * 100n;
    if (cost < 1000n) {
        cost = 1000n;
    }

    elements.gachaCost.textContent = `(コスト: ${formatMoney(cost)})`;

    // ボタンの有効/無効
    if (gameState.money >= cost) {
        elements.gachaButton.disabled = false;
    } else {
        elements.gachaButton.disabled = true;
    }
}

// =====================
// インベントリ表示の更新
// =====================
function updateInventoryDisplay() {
    if (gameState.inventory.length === 0) {
        elements.inventoryList.innerHTML = '<div class="inventory-empty">まだ設備がありません。ガチャを回してね！</div>';
        return;
    }

    elements.inventoryList.innerHTML = gameState.inventory.map(item => `
        <div class="inventory-item">
            <div class="item-info">
                <div class="item-emoji">${item.emoji}</div>
                <div class="item-details">
                    <div class="item-name">${item.name}</div>
                    <span class="item-rarity ${item.rarity}">${item.rarity}</span>
                </div>
            </div>
            <div class="item-production">${formatMoney(item.production)}/秒</div>
        </div>
    `).join('');
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

    // 1秒後に削除
    setTimeout(() => {
        particle.remove();
    }, 1000);
}

// =====================
// ゲームループ
// =====================
let lastTime = Date.now();
let productionAccumulator = 0;

function gameLoop() {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastTime) / 1000; // 秒単位
    lastTime = currentTime;

    // 電力の減衰 (毎秒-2%)
    gameState.energy = Math.max(0, gameState.energy - (2.0 * deltaTime));

    // 自動生産の加算 (毎秒)
    const productionMultiplier = getProductionMultiplier();
    const effectiveProduction = gameState.totalProduction * BigInt(Math.floor(productionMultiplier * 100)) / 100n;

    productionAccumulator += Number(effectiveProduction) * deltaTime;

    if (productionAccumulator >= 1) {
        const addMoney = BigInt(Math.floor(productionAccumulator));
        gameState.money += addMoney;
        productionAccumulator -= Number(addMoney);
    }

    // UI更新
    updateUI();

    // 次のフレーム
    requestAnimationFrame(gameLoop);
}

// =====================
// タイピング機能
// =====================

// ワードリスト（3段階の難易度）
const wordLists = {
    level1: [
        { word: 'w', reading: 'w' },
        { word: 'kusa', reading: 'kusa' },
        { word: 'nida', reading: 'nida' },
        { word: 'yabai', reading: 'yabai' },
        { word: 'sugoi', reading: 'sugoi' },
        { word: 'kawaii', reading: 'kawaii' },
        { word: 'sushi', reading: 'sushi' }
    ],
    level2: [
        { word: 'chaos', reading: 'chaos' },
        { word: 'dragon', reading: 'dragon' },
        { word: 'awakening', reading: 'awakening' },
        { word: 'darkness', reading: 'darkness' },
        { word: 'destiny', reading: 'destiny' },
        { word: 'infinity', reading: 'infinity' },
        { word: 'phantom', reading: 'phantom' }
    ],
    level3: [
        { word: 'consensus', reading: 'consensus' },
        { word: 'synergy', reading: 'synergy' },
        { word: 'paradigm', reading: 'paradigm' },
        { word: 'leverage', reading: 'leverage' },
        { word: 'optimize', reading: 'optimize' },
        { word: 'innovation', reading: 'innovation' },
        { word: 'disruption', reading: 'disruption' }
    ]
};

// タイピングステート
const typingState = {
    currentWord: null,
    currentInput: '',
    startTime: null,
    totalTyped: 0
};

// 新しい単語を設定
function setNewWord() {
    // 所持金に応じて難易度を変更
    let level = 'level1';
    if (gameState.money > 1000000n) {
        level = 'level3';
    } else if (gameState.money > 10000n) {
        level = 'level2';
    }

    const words = wordLists[level];
    const randomWord = words[Math.floor(Math.random() * words.length)];

    typingState.currentWord = randomWord;
    typingState.currentInput = '';
    typingState.startTime = Date.now();

    elements.targetWord.textContent = randomWord.word;
    elements.userInput.textContent = '';
    elements.feedback.textContent = '';
}

// ローマ字の揺らぎを許容する判定
function checkInput(target, input) {
    // 完全一致
    if (target === input) {
        return { match: true, complete: true };
    }

    // 前方一致（入力途中）
    if (target.startsWith(input)) {
        return { match: true, complete: false };
    }

    // ローマ字揺らぎのパターン（簡易版）
    const patterns = {
        'shi': ['si', 'shi'],
        'chi': ['ti', 'chi'],
        'tsu': ['tu', 'tsu'],
        'fu': ['hu', 'fu'],
        'ji': ['zi', 'ji']
    };

    // パターンマッチング
    for (let [standard, alternatives] of Object.entries(patterns)) {
        for (let alt of alternatives) {
            const targetAlt = target.replace(standard, alt);
            if (targetAlt === input) {
                return { match: true, complete: true };
            }
            if (targetAlt.startsWith(input)) {
                return { match: true, complete: false };
            }
        }
    }

    return { match: false, complete: false };
}

// タイピング成功時の処理
function onTypingSuccess() {
    // WPM計算
    const elapsedMinutes = (Date.now() - typingState.startTime) / 60000;
    const wpm = Math.floor(1 / elapsedMinutes);
    if (wpm > gameState.highScore) {
        gameState.highScore = wpm;
    }

    // お金の獲得
    let earnedMoney = gameState.clickValue;
    if (gameState.isFever) {
        earnedMoney *= 2n; // Feverモードは2倍
    }
    gameState.money += earnedMoney;

    // 電力回復
    gameState.energy = Math.min(100, gameState.energy + 5.0);

    // コンボ増加
    gameState.combo++;
    if (gameState.combo >= 10) {
        gameState.isFever = true;
    }

    // フィードバック
    elements.feedback.textContent = `+${formatMoney(earnedMoney)} 🎉`;
    elements.feedback.style.color = '#00ff88';

    // パーティクル演出
    const rect = elements.sushiDisplay.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const offsetX = (Math.random() - 0.5) * 100;
            const offsetY = (Math.random() - 0.5) * 100;
            createParticle(centerX + offsetX, centerY + offsetY, '💰');
        }, i * 50);
    }

    // 次の単語へ
    setTimeout(() => {
        setNewWord();
    }, 300);
}

// タイピング失敗時の処理
function onTypingMiss() {
    // コンボリセット
    gameState.combo = 0;
    gameState.isFever = false;

    // フィードバック
    elements.feedback.textContent = 'ミス！ ❌';
    elements.feedback.style.color = '#ff4444';

    // 入力をリセット
    typingState.currentInput = '';
    elements.userInput.textContent = '';
}

// キーボード入力のハンドリング
function handleKeyPress(event) {
    // 特殊キーは無視
    if (event.key.length > 1 && event.key !== 'Backspace' && event.key !== 'Enter') {
        return;
    }

    event.preventDefault();

    // Backspaceで1文字削除
    if (event.key === 'Backspace') {
        typingState.currentInput = typingState.currentInput.slice(0, -1);
        elements.userInput.textContent = typingState.currentInput;
        return;
    }

    // Enterで強制スキップ（デバッグ用）
    if (event.key === 'Enter') {
        setNewWord();
        return;
    }

    // 英数字のみ受け付け
    if (!/^[a-zA-Z0-9]$/.test(event.key)) {
        return;
    }

    // 入力文字を追加
    typingState.currentInput += event.key.toLowerCase();
    elements.userInput.textContent = typingState.currentInput;

    // 判定
    const target = typingState.currentWord.reading;
    const result = checkInput(target, typingState.currentInput);

    if (result.complete) {
        // 正解
        onTypingSuccess();
    } else if (!result.match) {
        // ミス
        onTypingMiss();
    }
}

// =====================
// ガチャ・インベントリシステム
// =====================

// ガチャテーブル（設備のテンプレート）
const gachaTable = [
    // N (50%)
    { rarity: 'N', emoji: '🤖', name: 'タワシロボ', production: 100n, weight: 50 },
    { rarity: 'N', emoji: '🍙', name: 'おにぎりマシン', production: 150n, weight: 50 },
    { rarity: 'N', emoji: '🍜', name: 'ラーメンポット', production: 200n, weight: 50 },
    { rarity: 'N', emoji: '🍵', name: 'お茶メーカー', production: 120n, weight: 50 },

    // R (30%)
    { rarity: 'R', emoji: '🍱', name: '弁当ファクトリー', production: 1000n, weight: 30 },
    { rarity: 'R', emoji: '🍰', name: 'ケーキオーブン', production: 1500n, weight: 30 },
    { rarity: 'R', emoji: '🍕', name: 'ピザ窯', production: 2000n, weight: 30 },
    { rarity: 'R', emoji: '🍔', name: 'バーガーマシン', production: 1800n, weight: 30 },

    // SR (15%)
    { rarity: 'SR', emoji: '🏭', name: '寿司工場', production: 10000n, weight: 15 },
    { rarity: 'SR', emoji: '🚀', name: 'ロケットプラント', production: 15000n, weight: 15 },
    { rarity: 'SR', emoji: '💎', name: 'ダイヤモンド鉱山', production: 20000n, weight: 15 },

    // SSR (4%)
    { rarity: 'SSR', emoji: '🌟', name: '星屑ジェネレーター', production: 100000n, weight: 4 },
    { rarity: 'SSR', emoji: '🔥', name: '太陽炉', production: 150000n, weight: 4 },

    // UR (1%)
    { rarity: 'UR', emoji: '🌌', name: '銀河コンプレッサー', production: 1000000n, weight: 1 },
    { rarity: 'UR', emoji: '⚡', name: '次元発電機', production: 5000000n, weight: 1 }
];

// ガチャを実行
function rollGacha() {
    // コスト計算
    let cost = gameState.totalProduction * 100n;
    if (cost < 1000n) {
        cost = 1000n;
    }

    // 所持金チェック
    if (gameState.money < cost) {
        elements.feedback.textContent = 'お金が足りません！';
        elements.feedback.style.color = '#ff4444';
        return;
    }

    // お金を消費
    gameState.money -= cost;

    // 重み付き抽選
    const totalWeight = gachaTable.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    let selectedItem = null;
    for (let item of gachaTable) {
        random -= item.weight;
        if (random <= 0) {
            selectedItem = item;
            break;
        }
    }

    // アイテムを作成
    const newItem = {
        id: `item_${Date.now()}_${Math.random()}`,
        name: selectedItem.name,
        emoji: selectedItem.emoji,
        rarity: selectedItem.rarity,
        production: selectedItem.production,
        multiplier: 1.0
    };

    // インベントリに追加
    gameState.inventory.push(newItem);

    // 総生産額を更新
    recalculateTotalProduction();

    // フィードバック
    elements.feedback.textContent = `${selectedItem.emoji} ${selectedItem.name} (${selectedItem.rarity}) を入手！`;
    elements.feedback.style.color = getRarityColor(selectedItem.rarity);

    // ガチャ演出
    animateGacha(selectedItem);

    // UI更新
    updateUI();

    // コンソールログ
    console.log(`ガチャ結果: ${selectedItem.name} (${selectedItem.rarity})`);
}

// レアリティに応じた色を返す
function getRarityColor(rarity) {
    switch (rarity) {
        case 'N': return '#888';
        case 'R': return '#4488ff';
        case 'SR': return '#ff44ff';
        case 'SSR': return '#ffaa00';
        case 'UR': return '#ff0000';
        default: return '#fff';
    }
}

// ガチャ演出
function animateGacha(item) {
    const gachaButton = elements.gachaButton;

    // ボタンを一時的に無効化
    gachaButton.disabled = true;

    // パーティクル演出
    const rect = gachaButton.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            const offsetX = (Math.random() - 0.5) * 150;
            const offsetY = (Math.random() - 0.5) * 150;
            createParticle(centerX + offsetX, centerY + offsetY, '🎁');
        }, i * 50);
    }

    // 大きなアイテム表示
    setTimeout(() => {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                createParticle(centerX, centerY - 100, item.emoji);
            }, i * 200);
        }
    }, 500);

    // ボタンを再有効化
    setTimeout(() => {
        gachaButton.disabled = false;
        updateGachaCost();
    }, 1500);
}

// 総生産額を再計算
function recalculateTotalProduction() {
    gameState.totalProduction = 0n;
    for (let item of gameState.inventory) {
        gameState.totalProduction += item.production;
    }
}

// =====================
// セーブ・ロード機能
// =====================

// ゲームをセーブ
function saveGame() {
    try {
        const saveData = {
            money: gameState.money.toString(), // BigIntは文字列に変換
            energy: gameState.energy,
            totalProduction: gameState.totalProduction.toString(),
            clickValue: gameState.clickValue.toString(),
            inventory: gameState.inventory.map(item => ({
                ...item,
                production: item.production.toString()
            })),
            highScore: gameState.highScore,
            combo: gameState.combo,
            isFever: gameState.isFever
        };

        localStorage.setItem('sushiTyperFactory', JSON.stringify(saveData));
        console.log('💾 ゲームを自動保存しました');
    } catch (error) {
        console.error('セーブに失敗しました:', error);
    }
}

// ゲームをロード
function loadGame() {
    try {
        const saveDataStr = localStorage.getItem('sushiTyperFactory');
        if (!saveDataStr) {
            console.log('セーブデータが見つかりません。新規ゲームを開始します。');
            return false;
        }

        const saveData = JSON.parse(saveDataStr);

        // データを復元（BigIntに変換）
        gameState.money = BigInt(saveData.money);
        gameState.energy = saveData.energy;
        gameState.totalProduction = BigInt(saveData.totalProduction);
        gameState.clickValue = BigInt(saveData.clickValue);
        gameState.inventory = saveData.inventory.map(item => ({
            ...item,
            production: BigInt(item.production)
        }));
        gameState.highScore = saveData.highScore;
        gameState.combo = saveData.combo || 0;
        gameState.isFever = saveData.isFever || false;

        console.log('📂 セーブデータをロードしました');
        return true;
    } catch (error) {
        console.error('ロードに失敗しました:', error);
        return false;
    }
}

// 定期的に自動保存
function startAutoSave() {
    setInterval(() => {
        saveGame();
    }, 30000); // 30秒ごとに自動保存
}

// ゲームをリセット
function resetGame() {
    if (confirm('本当にゲームをリセットしますか？全てのデータが削除されます。')) {
        localStorage.removeItem('sushiTyperFactory');
        location.reload();
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

    // タイピング開始
    setNewWord();

    // キーボードイベント
    window.addEventListener('keydown', handleKeyPress);

    // ガチャボタン
    elements.gachaButton.addEventListener('click', rollGacha);

    // 自動保存開始
    startAutoSave();

    // ページを離れる前に保存
    window.addEventListener('beforeunload', saveGame);

    // ゲームループ開始
    requestAnimationFrame(gameLoop);

    console.log('✅ 全機能実装完了！寿司工場を楽しんでね！');
}

// ページ読み込み後に初期化
window.addEventListener('DOMContentLoaded', init);
