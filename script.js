// =====================
// 定数定義
// =====================
const CONSTANTS = {
    COMBO_THRESHOLD: 20,          // フィーバー発動に必要なコンボ数
    BASE_FEVER_MULTIPLIER: 1.5,   // フィーバー基本倍率
    FEVER_MULTIPLIER_STEP: 0.5,   // フィーバーレベルごとの倍率上昇
    BASE_TIME: 30,                // 基本制限時間（秒）
    TIME_PER_LEVEL: 5,            // レベルごとの時間延長（秒）
    WORD_COMPLETE_BONUS: 2,       // 単語完成ボーナス倍率
    PARTICLE_LIFETIME: 1000,      // パーティクル表示時間（ms）
    SESSION_END_DELAY: 1500,      // セッション終了後のショップ表示遅延（ms）
    WORD_CHANGE_DELAY: 200,       // 単語完成後の次の単語表示遅延（ms）
    SAVE_KEY: 'sushiTyperFactory', // localStorageのキー
    TIMER_WARNING_THRESHOLD: 0.3, // タイマー警告閾値（残り時間の割合）
    TIMER_DANGER_THRESHOLD: 10    // タイマー危険閾値（秒）
};

// =====================
// グローバルステート
// =====================
const gameState = {
    money: 0,
    sessionEarnings: 0,
    upgrades: {
        charValue: 0,
        timeLimit: 0,
        comboMultiplier: 0,
        unlockLevel2: 0,
        unlockLevel3: 0,
        unlockLevel4: 0,
        unlockLevel5: 0
    },
    difficulty: 'easy',
    isPlaying: false,
    timeRemaining: CONSTANTS.BASE_TIME,
    maxTime: CONSTANTS.BASE_TIME,
    combo: 0,
    totalWords: 0,
    correctChars: 0,
    activeTheme: 'default',
    unlockedThemes: ['default']
};

// =====================
// UI要素の取得（エラーハンドリング付き）
// =====================
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element not found: ${id}`);
    }
    return element;
}

const elements = {};

function initElements() {
    elements.moneyValue = getElement('moneyValue');
    elements.timerValue = getElement('timerValue');
    elements.timerBar = getElement('timerBar');
    elements.charValue = getElement('charValue');
    elements.targetWordJapanese = getElement('targetWordJapanese');
    elements.targetWord = getElement('targetWord');
    elements.userInput = getElement('userInput');
    elements.feedback = getElement('feedback');
    elements.comboDisplay = getElement('comboDisplay');
    elements.startButton = getElement('startButton');
    elements.typingMode = getElement('typingMode');
    elements.shopMode = getElement('shopMode');
    elements.upgradeList = getElement('upgradeList');
    elements.openShop = getElement('openShop');
    elements.backToTyping = getElement('backToTypingUpper');
    elements.shopMoneyValue = getElement('shopMoneyValue');
    elements.resetButton = getElement('resetButton');
    elements.particleContainer = getElement('particleContainer');
    elements.difficultyLevel1 = getElement('difficultyLevel1');
    elements.difficultyLevel2 = getElement('difficultyLevel2');
    elements.difficultyLevel3 = getElement('difficultyLevel3');
    elements.difficultyLevel4 = getElement('difficultyLevel4');
    elements.difficultyLevel5 = getElement('difficultyLevel5');
    elements.themeList = getElement('themeList');
    elements.difficultyMessage = getElement('difficultyMessage');
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
        maxLevel: 100,
        baseCost: 100,
        costMultiplier: 1.25,
        getEffect: (level) => 1 + (level * 2),
        getDescription: (level) => `${1 + (level * 2)}円 → ${1 + ((level + 1) * 2)}円`
    },
    timeLimit: {
        name: '制限時間延長',
        icon: '⏰',
        maxLevel: 30,
        baseCost: 500,
        costMultiplier: 1.3,
        getEffect: (level) => CONSTANTS.BASE_TIME + (level * CONSTANTS.TIME_PER_LEVEL),
        getDescription: (level) => `${CONSTANTS.BASE_TIME + (level * CONSTANTS.TIME_PER_LEVEL)}秒 → ${CONSTANTS.BASE_TIME + ((level + 1) * CONSTANTS.TIME_PER_LEVEL)}秒`
    },
    comboMultiplier: {
        name: 'フィーバーレベル解放',
        icon: '🔥',
        maxLevel: 10,
        baseCost: 2000,
        costMultiplier: 1.5,
        getEffect: (level) => level,
        getDescription: (level) => {
            if (level === 0) {
                return `${CONSTANTS.COMBO_THRESHOLD}コンボで「報酬${(CONSTANTS.BASE_FEVER_MULTIPLIER + CONSTANTS.FEVER_MULTIPLIER_STEP).toFixed(1)}倍」が発動可能に`;
            }
            const nextThreshold = CONSTANTS.COMBO_THRESHOLD * (level + 1);
            const nextMultiplier = CONSTANTS.BASE_FEVER_MULTIPLIER + ((level + 1) * CONSTANTS.FEVER_MULTIPLIER_STEP);
            return `次: ${nextThreshold}コンボで${nextMultiplier.toFixed(1)}倍`;
        }
    },
    unlockLevel2: {
        name: '難易度「レベル2」解放',
        icon: '🔓',
        maxLevel: 1,
        baseCost: 2500,
        costMultiplier: 1,
        getEffect: (level) => level > 0,
        getDescription: (level) => level > 0 ? '解放済み' : '「レベル2 (報酬2倍)」を解放'
    },
    unlockLevel3: {
        name: '難易度「レベル3」解放',
        icon: '🔓',
        maxLevel: 1,
        baseCost: 5000,
        costMultiplier: 1,
        getEffect: (level) => level > 0,
        getDescription: (level) => level > 0 ? '解放済み' : '「レベル3 (報酬3倍)」を解放'
    },
    unlockLevel4: {
        name: '難易度「レベル4」解放',
        icon: '🔓',
        maxLevel: 1,
        baseCost: 15000,
        costMultiplier: 1,
        getEffect: (level) => level > 0,
        getDescription: (level) => level > 0 ? '解放済み' : '「レベル4 (報酬5倍)」を解放'
    },
    unlockLevel5: {
        name: '難易度「レベル5」解放',
        icon: '🔓',
        maxLevel: 1,
        baseCost: 25000,
        costMultiplier: 1,
        getEffect: (level) => level > 0,
        getDescription: (level) => level > 0 ? '解放済み' : '「レベル5 (報酬10倍)」を解放'
    }
};

function getUpgradeCost(upgradeType) {
    const config = upgradeConfig[upgradeType];
    if (!config) return Infinity;
    const level = gameState.upgrades[upgradeType] || 0;
    return Math.floor(config.baseCost * Math.pow(config.costMultiplier, level));
}

function buyUpgrade(upgradeType) {
    const config = upgradeConfig[upgradeType];
    if (!config) return;

    const currentLevel = gameState.upgrades[upgradeType] || 0;

    if (currentLevel >= config.maxLevel) {
        showFeedback('最大レベルです！', '#ffaa00');
        return;
    }

    const cost = getUpgradeCost(upgradeType);

    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.upgrades[upgradeType]++;

        updateUpgradeDisplay();
        updateDifficultyButtons();
        updateUI();
        saveGame();

        showFeedback(`${config.icon} ${config.name} レベルアップ！`, '#00ff88');
    } else {
        showFeedback('お金が足りません！', '#ff4444');
    }
}

// =====================
// 難易度設定
// =====================
const difficultyConfig = {
    easy: { name: 'レベル1', multiplier: 1.0, color: '#00ff88', unlockKey: null },
    normal: { name: 'レベル2', multiplier: 2.0, color: '#ffaa00', unlockKey: 'unlockLevel2' },
    hard: { name: 'レベル3', multiplier: 3.0, color: '#ff4444', unlockKey: 'unlockLevel3' },
    level4: { name: 'レベル4', multiplier: 5.0, color: '#ff00ff', unlockKey: 'unlockLevel4' },
    level5: { name: 'レベル5', multiplier: 10.0, color: '#ff0000', unlockKey: 'unlockLevel5' }
};

const difficultyOrder = ['easy', 'normal', 'hard', 'level4', 'level5'];

function isDifficultyUnlocked(difficulty) {
    const config = difficultyConfig[difficulty];
    if (!config) return false;
    if (!config.unlockKey) return true;
    return gameState.upgrades[config.unlockKey] > 0;
}

function updateDifficultyButtons() {
    difficultyOrder.forEach((diff, index) => {
        const elementKey = `difficultyLevel${index + 1}`;
        const button = elements[elementKey];
        if (!button) return;

        const isUnlocked = isDifficultyUnlocked(diff);
        button.classList.toggle('locked', !isUnlocked);
        button.classList.toggle('active', gameState.difficulty === diff);

        if (!isUnlocked) {
            button.setAttribute('data-locked', 'true');
        } else {
            button.removeAttribute('data-locked');
        }
    });
}

function setDifficulty(difficulty) {
    if (gameState.isPlaying) return;

    if (!isDifficultyUnlocked(difficulty)) {
        const config = difficultyConfig[difficulty];
        if (elements.difficultyMessage) {
            elements.difficultyMessage.textContent = `「${config.name}」を解放するにはショップで購入してください！`;
            elements.difficultyMessage.style.color = '#ffaa00';
        }
        return;
    }

    if (elements.difficultyMessage) {
        elements.difficultyMessage.textContent = '';
    }

    gameState.difficulty = difficulty;
    updateDifficultyButtons();
    saveGame();
}

// =====================
// ローマ字変換マップ
// =====================
const romajiMap = {
    'あ': ['a'], 'い': ['i', 'yi'], 'う': ['u', 'wu'], 'え': ['e'], 'お': ['o'],
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
    'だ': ['da'], 'ぢ': ['di'], 'づ': ['du', 'zu'], 'で': ['de'], 'ど': ['do'],
    'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
    'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],
    'きゃ': ['kya', 'kilya', 'kixya'], 'きゅ': ['kyu', 'kilyu', 'kixyu'], 'きょ': ['kyo', 'kilyo', 'kixyo'],
    'しゃ': ['sya', 'sha', 'silya', 'sixya', 'shilya', 'shixya'],
    'しゅ': ['syu', 'shu', 'silyu', 'sixyu', 'shilyu', 'shixyu'],
    'しょ': ['syo', 'sho', 'silyo', 'sixyo', 'shilyo', 'shixyo'],
    'ちゃ': ['tya', 'cha', 'tilya', 'tixya', 'chilya', 'chixya', 'cya'],
    'ちゅ': ['tyu', 'chu', 'tilyu', 'tixyu', 'chilyu', 'chixyu', 'cyu'],
    'ちょ': ['tyo', 'cho', 'tilyo', 'tixyo', 'chilyo', 'chixyo', 'cyo'],
    'にゃ': ['nya', 'nilya', 'nixya'], 'にゅ': ['nyu', 'nilyu', 'nixyu'], 'にょ': ['nyo', 'nilyo', 'nixyo'],
    'ひゃ': ['hya', 'hilya', 'hixya'], 'ひゅ': ['hyu', 'hilyu', 'hixyu'], 'ひょ': ['hyo', 'hilyo', 'hixyo'],
    'みゃ': ['mya', 'milya', 'mixya'], 'みゅ': ['myu', 'milyu', 'mixyu'], 'みょ': ['myo', 'milyo', 'mixyo'],
    'りゃ': ['rya', 'rilya', 'rixya'], 'りゅ': ['ryu', 'rilyu', 'rixyu'], 'りょ': ['ryo', 'rilyo', 'rixyo'],
    'ぎゃ': ['gya', 'gilya', 'gixya'], 'ぎゅ': ['gyu', 'gilyu', 'gixyu'], 'ぎょ': ['gyo', 'gilyo', 'gixyo'],
    'じゃ': ['ja', 'jya', 'zya', 'jilya', 'jixya', 'zilya', 'zixya'],
    'じゅ': ['ju', 'jyu', 'zyu', 'jilyu', 'jixyu', 'zilyu', 'zixyu'],
    'じょ': ['jo', 'jyo', 'zyo', 'jilyo', 'jixyo', 'zilyo', 'zixyo'],
    'びゃ': ['bya', 'bilya', 'bixya'], 'びゅ': ['byu', 'bilyu', 'bixyu'], 'びょ': ['byo', 'bilyo', 'bixyo'],
    'ぴゃ': ['pya', 'pilya', 'pixya'], 'ぴゅ': ['pyu', 'pilyu', 'pixyu'], 'ぴょ': ['pyo', 'pilyo', 'pixyo'],
    'ぁ': ['xa', 'la'], 'ぃ': ['xi', 'li'], 'ぅ': ['xu', 'lu'], 'ぇ': ['xe', 'le'], 'ぉ': ['xo', 'lo'],
    'っ': ['xtu', 'ltu', 'xtsu', 'ltsu'],
    'ゃ': ['xya', 'lya'], 'ゅ': ['xyu', 'lyu'], 'ょ': ['xyo', 'lyo'],
    'ー': ['-'],
    'でぃ': ['dhi', 'dexi', 'deli'],
    'でゅ': ['dhu', 'dexyu', 'delyu'],
    'てぃ': ['thi', 'texi', 'teli'],
    'ふぁ': ['fa', 'fuxa', 'fula', 'huxa', 'hula'],
    'ふぃ': ['fi', 'fuxi', 'fuli', 'huxi', 'huli'],
    'ふぇ': ['fe', 'fuxe', 'fule', 'huxe', 'hule'],
    'ふぉ': ['fo', 'fuxo', 'fulo', 'huxo', 'hulo'],
    'うぃ': ['wi', 'uxi', 'uli'],
    'うぇ': ['we', 'uxe', 'ule'],
    'うぉ': ['wo', 'uxo', 'ulo'],
    'ゔ': ['vu'],
    'ゔぁ': ['va'],
    'ゔぃ': ['vi'],
    'ゔぇ': ['ve'],
    'ゔぉ': ['vo']
};

// =====================
// タイピングステート
// =====================
const typingState = {
    currentWord: null,
    currentInput: '',
    allPossibleRomaji: []
};

// =====================
// タイピング機能
// =====================
function setNewWord() {
    const words = wordLists[gameState.difficulty];
    if (!words || words.length === 0) {
        console.error(`No words found for difficulty: ${gameState.difficulty}`);
        return;
    }

    const randomWord = words[Math.floor(Math.random() * words.length)];
    const reading = randomWord.reading || randomWord.japanese;

    typingState.currentWord = { ...randomWord, reading };
    typingState.currentInput = '';

    updatePossiblePatternsFromReading(reading);

    if (elements.targetWordJapanese) {
        elements.targetWordJapanese.textContent = randomWord.japanese;
    }
    if (elements.targetWord) {
        elements.targetWord.textContent = typingState.allPossibleRomaji[0] || '';
    }
    if (elements.userInput) {
        elements.userInput.textContent = '';
    }
    if (elements.feedback) {
        elements.feedback.textContent = '';
    }
}

function updatePossiblePatternsFromReading(reading) {
    let patterns = [''];
    let i = 0;

    while (i < reading.length) {
        let currentPatterns = [];
        let foundMatch = false;

        // 促音の特殊処理
        if (reading[i] === 'っ' && i + 1 < reading.length) {
            const nextChar = reading[i + 1];
            let nextVariants = [];

            if (i + 2 < reading.length && romajiMap[reading.substring(i + 1, i + 3)]) {
                nextVariants = romajiMap[reading.substring(i + 1, i + 3)];
            } else if (romajiMap[nextChar]) {
                nextVariants = romajiMap[nextChar];
            }

            if (nextVariants.length > 0) {
                for (let p of patterns) {
                    for (let nv of nextVariants) {
                        const firstChar = nv[0];
                        if (!['a', 'i', 'u', 'e', 'o', 'n'].includes(firstChar) && /^[a-z]$/i.test(firstChar)) {
                            currentPatterns.push(p + firstChar);
                        }
                    }
                    for (let v of romajiMap['っ']) {
                        currentPatterns.push(p + v);
                    }
                }
                patterns = currentPatterns;
                i++;
                foundMatch = true;
            }
        }

        if (foundMatch) continue;

        // 2文字（拗音など）のチェック
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

        // 1文字のチェック
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

    typingState.allPossibleRomaji = [...new Set(patterns)];
}

function getCharValue() {
    const baseValue = upgradeConfig.charValue.getEffect(gameState.upgrades.charValue);
    const multiplier = difficultyConfig[gameState.difficulty]?.multiplier || 1;
    return Math.floor(baseValue * multiplier);
}

function calculateFeverMultiplier() {
    const currentComboLevel = Math.floor(gameState.combo / CONSTANTS.COMBO_THRESHOLD);
    const unlockedMaxLevel = gameState.upgrades.comboMultiplier;
    const activeFeverLevel = Math.min(currentComboLevel, unlockedMaxLevel);

    if (activeFeverLevel > 0) {
        return {
            level: activeFeverLevel,
            multiplier: CONSTANTS.BASE_FEVER_MULTIPLIER + (activeFeverLevel * CONSTANTS.FEVER_MULTIPLIER_STEP)
        };
    }
    return { level: 0, multiplier: 1 };
}

function handleChar(char) {
    const inputSoFar = typingState.currentInput + char;
    const validPatterns = typingState.allPossibleRomaji.filter(p => p.startsWith(inputSoFar));

    if (validPatterns.length > 0) {
        typingState.currentInput = inputSoFar;
        gameState.combo++;
        gameState.correctChars++;

        if (elements.targetWord) {
            elements.targetWord.textContent = validPatterns[0];
        }

        let charValue = getCharValue();
        const fever = calculateFeverMultiplier();

        if (fever.level > 0) {
            charValue = Math.floor(charValue * fever.multiplier);
            showFeedback(`+${charValue} (Lv.${fever.level}🔥)`, '#ff00ff');
            document.body.classList.add('fever-mode');
        } else {
            showFeedback(`+${charValue}`, '#00ff88');
            document.body.classList.remove('fever-mode');
        }

        gameState.money += charValue;
        gameState.sessionEarnings += charValue;

        updateComboDisplay(fever);

        if (elements.userInput) {
            elements.userInput.textContent = typingState.currentInput;
        }
        if (elements.moneyValue) {
            elements.moneyValue.textContent = formatMoney(Math.floor(gameState.money));
        }

        createParticle(window.innerWidth / 2, window.innerHeight / 2, '💰');

        // 単語完成チェック
        if (validPatterns.some(p => p === typingState.currentInput)) {
            gameState.totalWords++;
            const bonus = Math.floor(charValue * CONSTANTS.WORD_COMPLETE_BONUS);
            showFeedback(`単語完成! +${bonus}`, '#ffdd00');

            gameState.money += bonus;
            gameState.sessionEarnings += bonus;

            if (elements.moneyValue) {
                elements.moneyValue.textContent = formatMoney(Math.floor(gameState.money));
            }

            setTimeout(() => {
                if (gameState.isPlaying) {
                    setNewWord();
                }
            }, CONSTANTS.WORD_CHANGE_DELAY);
        }

        updateSessionUI();
    } else {
        // ミス
        gameState.combo = 0;
        updateComboDisplay({ level: 0, multiplier: 1 });
        showFeedback('MISS!', '#ff4444');
        document.body.classList.remove('fever-mode');
    }
}

function updateComboDisplay(fever) {
    if (!elements.comboDisplay) return;

    let comboText = `${gameState.combo} Combo`;
    if (fever.level > 0) {
        comboText += ` (${fever.multiplier.toFixed(1)}x)`;
        elements.comboDisplay.classList.add('fever');
    } else {
        elements.comboDisplay.classList.remove('fever');
    }
    elements.comboDisplay.textContent = comboText;
}

function showFeedback(text, color) {
    if (!elements.feedback) return;
    elements.feedback.textContent = text;
    elements.feedback.style.color = color;
}

function handleKeyPress(event) {
    if (!gameState.isPlaying) return;
    if (event.key.length > 1) return;

    event.preventDefault();

    const key = event.key.toLowerCase();
    if (!/^[a-z-]$/.test(key)) return;

    handleChar(key);
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
    if (elements.timerValue) {
        elements.timerValue.textContent = gameState.timeRemaining + '秒';
    }

    if (elements.timerBar) {
        const percentage = (gameState.timeRemaining / gameState.maxTime) * 100;
        elements.timerBar.style.width = percentage + '%';

        elements.timerBar.classList.remove('warning', 'danger');

        if (gameState.timeRemaining <= CONSTANTS.TIMER_DANGER_THRESHOLD) {
            elements.timerBar.classList.add('danger');
        } else if (gameState.timeRemaining <= gameState.maxTime * CONSTANTS.TIMER_WARNING_THRESHOLD) {
            elements.timerBar.classList.add('warning');
        }
    }

    if (elements.timerValue) {
        elements.timerValue.classList.remove('warning', 'danger');

        if (gameState.timeRemaining <= CONSTANTS.TIMER_DANGER_THRESHOLD) {
            elements.timerValue.classList.add('danger');
        } else if (gameState.timeRemaining <= gameState.maxTime * CONSTANTS.TIMER_WARNING_THRESHOLD) {
            elements.timerValue.classList.add('warning');
        }
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
    gameState.sessionEarnings = 0;
    gameState.correctChars = 0;
    gameState.totalWords = 0;
    gameState.combo = 0;

    if (elements.comboDisplay) {
        elements.comboDisplay.textContent = '0 Combo';
        elements.comboDisplay.classList.remove('fever');
    }

    if (elements.startButton) {
        elements.startButton.textContent = 'タイピング中...';
        elements.startButton.disabled = true;
    }

    showFeedback('がんばって！', '#00ff88');

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
    document.body.classList.remove('fever-mode');

    if (elements.startButton) {
        elements.startButton.textContent = 'タイピング開始！';
        elements.startButton.disabled = false;
    }

    if (elements.targetWordJapanese) {
        elements.targetWordJapanese.textContent = 'お疲れ様でした！';
    }
    if (elements.targetWord) {
        elements.targetWord.textContent = '';
    }
    if (elements.userInput) {
        elements.userInput.textContent = '';
    }

    showFeedback(`${formatMoney(Math.floor(gameState.sessionEarnings))} 獲得！`, '#ffaa00');

    document.querySelectorAll('.difficulty-button').forEach(btn => {
        btn.disabled = false;
    });

    saveGame();
    updateUI();

    setTimeout(() => {
        openShop();
    }, CONSTANTS.SESSION_END_DELAY);
}

// =====================
// テーマシステム
// =====================
const themeConfig = {
    default: { name: 'デフォルト', color: '#1a1a2e', textColor: '#fff', cost: 0, icon: '🍣' },
    deepsea: { name: '深海', color: '#001a33', textColor: '#00d4ff', cost: 10000, icon: '🐙' },
    neon: { name: 'ネオン', color: '#1a0033', textColor: '#ff00ff', cost: 50000, icon: '🌃' },
    sakura: { name: '桜', color: '#2e1a1a', textColor: '#ffb7c5', cost: 200000, icon: '🌸' },
    galaxy: { name: '宇宙', color: '#0a0a1a', textColor: '#fff', cost: 1000000, icon: '🌌' }
};

function buyTheme(themeId) {
    const theme = themeConfig[themeId];
    if (!theme) return;

    if (gameState.unlockedThemes.includes(themeId)) {
        applyTheme(themeId);
        updateThemeDisplay();
        return;
    }

    if (gameState.money >= theme.cost) {
        gameState.money -= theme.cost;
        gameState.unlockedThemes.push(themeId);
        applyTheme(themeId);
        updateThemeDisplay();
        updateUI();
        saveGame();
        showFeedback(`テーマ「${theme.name}」を購入！`, '#00ff88');
    } else {
        showFeedback('お金が足りません！', '#ff4444');
    }
}

function applyTheme(themeId) {
    const theme = themeConfig[themeId];
    if (!theme) return;

    gameState.activeTheme = themeId;
    document.body.style.backgroundColor = theme.color;
    document.documentElement.style.setProperty('--main-bg', theme.color);
    document.documentElement.style.setProperty('--main-text', theme.textColor);

    // テーマクラスを更新
    Object.keys(themeConfig).forEach(id => {
        document.body.classList.remove(`theme-${id}`);
    });
    document.body.classList.add(`theme-${themeId}`);

    saveGame();
}

function updateThemeDisplay() {
    if (!elements.themeList) return;

    elements.themeList.innerHTML = Object.keys(themeConfig).map(themeId => {
        const theme = themeConfig[themeId];
        const isUnlocked = gameState.unlockedThemes.includes(themeId);
        const isActive = gameState.activeTheme === themeId;
        const canBuy = gameState.money >= theme.cost;

        return `
            <div class="theme-item ${isActive ? 'active' : ''} ${isUnlocked ? 'unlocked' : ''}">
                <div class="theme-icon">${theme.icon}</div>
                <div class="theme-name">${theme.name}</div>
                ${isUnlocked ? `
                    <button class="theme-button ${isActive ? 'applied' : ''}" onclick="buyTheme('${themeId}')">
                        ${isActive ? '適用中' : '適用する'}
                    </button>
                ` : `
                    <div class="theme-cost">${formatMoney(theme.cost)}</div>
                    <button class="theme-button" onclick="buyTheme('${themeId}')" ${canBuy ? '' : 'disabled'}>
                        購入する
                    </button>
                `}
            </div>
        `;
    }).join('');
}

// =====================
// ショップシステム
// =====================
function openShop() {
    if (elements.typingMode) {
        elements.typingMode.classList.add('hidden');
    }
    if (elements.shopMode) {
        elements.shopMode.classList.remove('hidden');
    }
    updateUpgradeDisplay();
    updateThemeDisplay();
    updateUI();
}

function closeShop() {
    if (elements.shopMode) {
        elements.shopMode.classList.add('hidden');
    }
    if (elements.typingMode) {
        elements.typingMode.classList.remove('hidden');
    }
}

function updateUpgradeDisplay() {
    if (!elements.upgradeList) return;

    elements.upgradeList.innerHTML = Object.keys(upgradeConfig).map(upgradeType => {
        const config = upgradeConfig[upgradeType];
        const currentLevel = gameState.upgrades[upgradeType] || 0;
        const isMaxed = currentLevel >= config.maxLevel;
        const cost = isMaxed ? 0 : getUpgradeCost(upgradeType);
        const canBuy = !isMaxed && gameState.money >= cost;

        return `
            <div class="upgrade-item ${isMaxed ? 'maxed' : ''} ${canBuy ? 'affordable' : ''}">
                <div class="upgrade-icon">${config.icon}</div>
                <div class="upgrade-info">
                    <div class="upgrade-name">${config.name}</div>
                    <div class="upgrade-level">Lv.${currentLevel}/${config.maxLevel}</div>
                    <div class="upgrade-effect">${isMaxed ? '最大レベル達成！' : config.getDescription(currentLevel)}</div>
                </div>
                ${!isMaxed ? `
                    <div class="upgrade-action">
                        <div class="upgrade-cost">${formatMoney(cost)}</div>
                        <button class="upgrade-button" onclick="buyUpgrade('${upgradeType}')" ${canBuy ? '' : 'disabled'}>
                            購入
                        </button>
                    </div>
                ` : '<div class="upgrade-complete">✓</div>'}
            </div>
        `;
    }).join('');
}

// =====================
// UI更新関数
// =====================
function updateUI() {
    const moneyText = formatMoney(Math.floor(gameState.money));

    if (elements.moneyValue) {
        elements.moneyValue.textContent = moneyText;
    }
    if (elements.shopMoneyValue) {
        elements.shopMoneyValue.textContent = moneyText;
    }
    if (elements.charValue) {
        elements.charValue.textContent = getCharValue() + '円/文字';
    }

    updateThemeDisplay();
    updateUpgradeDisplay();
}

function updateSessionUI() {
    const moneyText = formatMoney(Math.floor(gameState.money));

    if (elements.moneyValue) {
        elements.moneyValue.textContent = moneyText;
    }
    if (elements.shopMoneyValue) {
        elements.shopMoneyValue.textContent = moneyText;
    }
}

// =====================
// パーティクル演出
// =====================
function createParticle(x, y, emoji) {
    if (!elements.particleContainer) return;

    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.textContent = emoji;

    // ランダムな横方向オフセット
    const offsetX = (Math.random() - 0.5) * 100;
    particle.style.left = (x + offsetX) + 'px';
    particle.style.top = y + 'px';

    elements.particleContainer.appendChild(particle);

    setTimeout(() => {
        particle.remove();
    }, CONSTANTS.PARTICLE_LIFETIME);
}

// =====================
// リセット機能
// =====================
function resetGame() {
    if (confirm('本当にゲームをリセットしますか？\n全てのデータが削除されます。')) {
        localStorage.removeItem(CONSTANTS.SAVE_KEY);
        location.reload();
    }
}

// =====================
// セーブ・ロード機能
// =====================
function saveGame() {
    try {
        const saveData = {
            version: 2,
            money: gameState.money,
            upgrades: { ...gameState.upgrades },
            difficulty: gameState.difficulty,
            activeTheme: gameState.activeTheme,
            unlockedThemes: [...gameState.unlockedThemes],
            savedAt: Date.now()
        };
        localStorage.setItem(CONSTANTS.SAVE_KEY, JSON.stringify(saveData));
    } catch (e) {
        console.error('セーブに失敗しました:', e);
    }
}

function loadGame() {
    try {
        const saved = localStorage.getItem(CONSTANTS.SAVE_KEY);
        if (!saved) {
            console.log('🆕 新規ゲーム開始');
            return;
        }

        const data = JSON.parse(saved);

        gameState.money = data.money || 0;
        gameState.difficulty = data.difficulty || 'easy';
        gameState.activeTheme = data.activeTheme || 'default';
        gameState.unlockedThemes = data.unlockedThemes || ['default'];

        if (data.upgrades) {
            Object.keys(data.upgrades).forEach(key => {
                if (gameState.upgrades.hasOwnProperty(key)) {
                    gameState.upgrades[key] = data.upgrades[key];
                }
            });
        }

        // テーマを適用
        applyTheme(gameState.activeTheme);

        console.log('💾 セーブデータを読み込みました');
    } catch (e) {
        console.error('ロードに失敗しました:', e);
    }
}

// =====================
// 初期化
// =====================
function init() {
    console.log('🍣 Sushi Typer Factory 起動!');

    initElements();
    loadGame();
    updateUI();
    updateDifficultyButtons();
    setDifficulty(gameState.difficulty);

    if (elements.targetWordJapanese) {
        elements.targetWordJapanese.textContent = '「タイピング開始！」を押してね';
    }
    if (elements.targetWord) {
        elements.targetWord.textContent = '';
    }

    // イベントリスナー登録
    if (elements.startButton) {
        elements.startButton.addEventListener('click', startSession);
    }
    if (elements.openShop) {
        elements.openShop.addEventListener('click', openShop);
    }
    if (elements.backToTyping) {
        elements.backToTyping.addEventListener('click', closeShop);
    }
    if (elements.resetButton) {
        elements.resetButton.addEventListener('click', resetGame);
    }

    // 難易度ボタン
    difficultyOrder.forEach((diff, index) => {
        const btn = elements[`difficultyLevel${index + 1}`];
        if (btn) {
            btn.addEventListener('click', () => setDifficulty(diff));
        }
    });

    window.addEventListener('keydown', handleKeyPress);

    console.log('✅ 初期化完了！');
}

// グローバル関数として公開
window.buyUpgrade = buyUpgrade;
window.buyTheme = buyTheme;

// ページ読み込み後に初期化
window.addEventListener('DOMContentLoaded', init);
