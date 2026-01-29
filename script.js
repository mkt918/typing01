// =====================
// グローバルステート
// =====================
const gameState = {
    money: 0,                   // 所持金
    sessionEarnings: 0,         // 今回のセッションで稼いだ金額
    upgrades: {                 // アップグレードレベル
        charValue: 0,           // 文字単価レベル
        timeLimit: 0,           // 制限時間レベル
        comboMultiplier: 0,     // フィーバー倍率レベル
        unlockLevel2: 0,        // レベル2解放
        unlockLevel3: 0,        // レベル3解放
        unlockLevel4: 0,        // レベル4解放
        unlockLevel5: 0         // レベル5解放
    },
    difficulty: 'easy',         // 現在の難易度
    isPlaying: false,           // タイピング中かどうか
    timeRemaining: 30,          // 残り時間（秒）
    maxTime: 30,                // 最大時間（秒）
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
    targetWordJapanese: document.getElementById('targetWordJapanese'),
    targetWord: document.getElementById('targetWord'),
    userInput: document.getElementById('userInput'),
    feedback: document.getElementById('feedback'),
    comboDisplay: document.getElementById('comboDisplay'),
    startButton: document.getElementById('startButton'),
    typingMode: document.getElementById('typingMode'),
    shopMode: document.getElementById('shopMode'),
    upgradeList: document.getElementById('upgradeList'),
    openShop: document.getElementById('openShop'),
    backToTyping: document.getElementById('backToTypingUpper'),
    shopMoneyValue: document.getElementById('shopMoneyValue'),
    resetButton: document.getElementById('resetButton'),
    particleContainer: document.getElementById('particleContainer'),
    difficultyLevel1: document.getElementById('difficultyLevel1'),
    difficultyLevel2: document.getElementById('difficultyLevel2'),
    difficultyLevel3: document.getElementById('difficultyLevel3'),
    difficultyLevel4: document.getElementById('difficultyLevel4'),
    difficultyLevel5: document.getElementById('difficultyLevel5')
};



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
        name: 'コンボレベル解放',
        icon: '🔥',
        maxLevel: 10,
        baseCost: 500,
        costMultiplier: 2.0,
        getEffect: (level) => level, // 到達可能な最大レベル
        getDescription: (level) => `最大フィーバーレベル Lv.${level} → Lv.${level + 1}`
    },
    unlockLevel2: {
        name: '難易度「レベル2」解放',
        icon: '🔓',
        maxLevel: 1,
        baseCost: 5000,
        costMultiplier: 1,
        getEffect: (level) => level > 0,
        getDescription: (level) => level > 0 ? '解放済み' : '「レベル2 (×1.5)」を解放します'
    },
    unlockLevel3: {
        name: '難易度「レベル3」解放',
        icon: '🔓',
        maxLevel: 1,
        baseCost: 10000,
        costMultiplier: 1,
        getEffect: (level) => level > 0,
        getDescription: (level) => level > 0 ? '解放済み' : '「レベル3 (×2.0)」を解放します'
    },
    unlockLevel4: {
        name: '難易度「レベル4」解放',
        icon: '🔓',
        maxLevel: 1,
        baseCost: 30000,
        costMultiplier: 1,
        getEffect: (level) => level > 0,
        getDescription: (level) => level > 0 ? '解放済み' : '「レベル4 (×3.0)」を解放します'
    },
    unlockLevel5: {
        name: '難易度「レベル5」解放',
        icon: '🔓',
        maxLevel: 1,
        baseCost: 50000,
        costMultiplier: 1,
        getEffect: (level) => level > 0,
        getDescription: (level) => level > 0 ? '解放済み' : '「レベル5 (×5.0)」を解放します'
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
    easy: { name: 'レベル1', multiplier: 1.0, color: '#00ff88' },
    normal: { name: 'レベル2', multiplier: 1.5, color: '#ffaa00' },
    hard: { name: 'レベル3', multiplier: 2.0, color: '#ff4444' },
    level4: { name: 'レベル4', multiplier: 3.0, color: '#ff00ff' },
    level5: { name: 'レベル5', multiplier: 5.0, color: '#ff0000' }
};

function setDifficulty(difficulty) {
    if (gameState.isPlaying) return;

    // 解放チェック
    const unlockMap = {
        'normal': 'unlockLevel2',
        'hard': 'unlockLevel3',
        'level4': 'unlockLevel4',
        'level5': 'unlockLevel5'
    };

    if (unlockMap[difficulty] && !gameState.upgrades[unlockMap[difficulty]]) {
        const config = difficultyConfig[difficulty];
        elements.feedback.textContent = `「${config.name}」を解放するにはショップで購入してください！`;
        elements.feedback.style.color = '#ffaa00';
        return;
    }

    gameState.difficulty = difficulty;

    document.querySelectorAll('.difficulty-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // elements[`difficultyLevelX`] の形式に対応
    let elementId = 'difficultyLevel';
    if (difficulty === 'easy') elementId += '1';
    else if (difficulty === 'normal') elementId += '2';
    else if (difficulty === 'hard') elementId += '3';
    else if (difficulty === 'level4') elementId += '4';
    else if (difficulty === 'level5') elementId += '5';

    if (elements[elementId]) {
        elements[elementId].classList.add('active');
    }

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
    'きゃ': ['kya', 'kixya'], 'きゅ': ['kyu', 'kixyu'], 'きょ': ['kyo', 'kixyo'],
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
    'っ': ['xtu', 'ltu', 'xtsu', 'ltsu'],
    'ー': ['-'],
    'でぃ': ['di', 'dexi', 'deli'],
    'でゅ': ['dyu', 'dexyu', 'delyu'],
    'てぃ': ['thi', 'texi', 'teli'],
    'ふぉ': ['fo', 'fuxo', 'fulo'],
    'ぅい': ['wi'],
    'うぃ': ['wi', 'uxi', 'uli'],
    'うぇ': ['we', 'uxe', 'ule'],
    'うぉ': ['wo', 'uxo', 'ulo'],
    'ゔ': ['v', 'vu']
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
        let currentPatterns = [];
        let foundMatch = false;

        // 1. 「っ」（促音）の特殊処理
        if (reading[i] === 'っ' && i + 1 < reading.length) {
            const nextChar = reading[i + 1];
            // 次の文字の最初のローマ字の頭文字を重ねるパターン（例：って -> tte）
            // 次の文字が「2文字」の場合（例：っちゃ -> ccha, scha...）も考慮
            let nextVariants = [];
            if (i + 2 < reading.length && romajiMap[reading.substring(i + 1, i + 3)]) {
                nextVariants = romajiMap[reading.substring(i + 1, i + 3)];
            } else if (romajiMap[nextChar]) {
                nextVariants = romajiMap[nextChar];
            }

            if (nextVariants.length > 0) {
                for (let p of patterns) {
                    // 子音重ねパターン（例：tt, ss）
                    for (let nv of nextVariants) {
                        const firstChar = nv[0];
                        // a,i,u,e,o,n 以外、かつアルファベットの場合に重ねる
                        if (!['a', 'i', 'u', 'e', 'o', 'n'].includes(firstChar) && /^[a-z]$/i.test(firstChar)) {
                            currentPatterns.push(p + firstChar);
                        }
                    }
                    // 独立パターンの追加（例：xtu, ltu）
                    for (let v of romajiMap['っ']) {
                        currentPatterns.push(p + v);
                    }
                }
                patterns = currentPatterns;
                i++; // 「っ」だけ処理して次へ（次は通常通り処理されるので結果として「tte」や「xtute」になる）
                foundMatch = true;
            }
        }

        if (foundMatch) continue;

        // 2. 2文字（拗音など）のチェック
        if (i + 1 < reading.length) {
            const twoChars = reading.substring(i, i + 2);
            if (romajiMap[twoChars]) {
                const variants = romajiMap[twoChars];
                for (let p of patterns) {
                    for (let v of variants) {
                        currentPatterns.push(p + v);
                    }
                }
                patterns = currentPatterns;
                i += 2;
                foundMatch = true;
            }
        }

        if (foundMatch) continue;

        // 3. 1文字のチェック
        const oneChar = reading[i];
        const variants = romajiMap[oneChar] || [oneChar];
        for (let p of patterns) {
            for (let v of variants) {
                currentPatterns.push(p + v);
            }
        }
        patterns = currentPatterns;
        i++;
    }

    // 重複を削除して保存
    typingState.allPossibleRomaji = [...new Set(patterns)];
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

        // フィーバーレベル計算 (20コンボごとに上昇)
        const currentComboLevel = Math.floor(gameState.combo / 20);
        const unlockedMaxLevel = gameState.upgrades.comboMultiplier;
        const activeFeverLevel = Math.min(currentComboLevel, unlockedMaxLevel);

        if (activeFeverLevel > 0) {
            // 倍率計算: Lv1=2.0, Lv2=2.5, Lv3=3.0...
            const feverMult = 1.5 + (activeFeverLevel * 0.5);
            charValue *= feverMult;

            elements.feedback.textContent = `+${Math.floor(charValue)} (Lv.${activeFeverLevel}🔥)`;
            elements.feedback.style.color = '#ff00ff';
            document.body.classList.add('fever-mode');
        } else {
            elements.feedback.textContent = `+${Math.floor(charValue)}`;
            elements.feedback.style.color = '#00ff88';
            document.body.classList.remove('fever-mode');
        }

        gameState.money += charValue;
        gameState.sessionEarnings += charValue;

        // コンボと現在の倍率を表示
        let comboText = `${gameState.combo} Combo`;
        if (activeFeverLevel > 0) {
            const feverMult = 1.5 + (activeFeverLevel * 0.5);
            comboText += ` (${feverMult.toFixed(1)}x)`;
        }
        elements.comboDisplay.textContent = comboText;

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


function openShop() {
    elements.typingMode.classList.add('hidden');
    elements.shopMode.classList.remove('hidden');
    updateUpgradeDisplay();
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


// =====================
// UI更新関数
// =====================
function updateUI() {
    const moneyText = formatMoney(Math.floor(gameState.money));
    elements.moneyValue.textContent = moneyText;
    if (elements.shopMoneyValue) elements.shopMoneyValue.textContent = moneyText;

    elements.charValue.textContent = getCharValue() + '円/文字';
}

function updateSessionUI() {
    const moneyText = formatMoney(Math.floor(gameState.money));
    elements.moneyValue.textContent = moneyText;
    if (elements.shopMoneyValue) elements.shopMoneyValue.textContent = moneyText;

    elements.sessionEarnings.textContent = formatMoney(gameState.sessionEarnings);
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
            upgrades: gameState.upgrades,
            difficulty: gameState.difficulty
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

        // アップグレードの統合（既存データに無い新しい項目を補完）
        if (saveData.upgrades) {
            Object.keys(saveData.upgrades).forEach(key => {
                if (gameState.upgrades.hasOwnProperty(key)) {
                    gameState.upgrades[key] = saveData.upgrades[key];
                }
            });
        }

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
    elements.difficultyLevel1.addEventListener('click', () => setDifficulty('easy'));
    elements.difficultyLevel2.addEventListener('click', () => setDifficulty('normal'));
    elements.difficultyLevel3.addEventListener('click', () => setDifficulty('hard'));
    elements.difficultyLevel4.addEventListener('click', () => setDifficulty('level4'));
    elements.difficultyLevel5.addEventListener('click', () => setDifficulty('level5'));
    window.addEventListener('keydown', handleKeyPress);

    // リアルタイム所持金更新開始
    updateMoneyRealtime();

    console.log('✅ 初期化完了！');
}

// グローバル関数として公開
window.buyUpgrade = buyUpgrade;

// ページ読み込み後に初期化
window.addEventListener('DOMContentLoaded', init);
