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
        maxLevel: 100, // 上限を増やして1円ベースに対応
        baseCost: 10,  // 初期コストも安く
        costMultiplier: 1.15,
        getEffect: (level) => 1 + level, // 1円スタート、1レベルにつき+1円
        getDescription: (level) => `${1 + level}円 → ${1 + level + 1}円`
    },
    timeLimit: {
        name: '制限時間延長',
        icon: '⏰',
        maxLevel: 30,
        baseCost: 300,
        costMultiplier: 1.2,
        getEffect: (level) => 60 + (level * 5),
        getDescription: (level) => `${60 + (level * 5)}秒 → ${60 + ((level + 1) * 5)}秒`
    },
    comboMultiplier: {
        name: 'コンボ集中力',
        icon: '🔥',
        maxLevel: 20,
        baseCost: 500,
        costMultiplier: 1.5,
        getEffect: (level) => 2.0 + (level * 0.1),
        getDescription: (level) => `フィーバー倍率 ${(2.0 + level * 0.1).toFixed(1)}倍 → ${(2.0 + (level + 1) * 0.1).toFixed(1)}倍`
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
    normal: [
        { japanese: '棚', romaji: 'tana' },
        { japanese: '何', romaji: 'nani' },
        { japanese: '立つ', romaji: 'tatsu' },
        { japanese: '母', romaji: 'haha' },
        { japanese: '耳', romaji: 'mimi' },
        { japanese: '谷', romaji: 'tani' },
        { japanese: '猫', romaji: 'neko' },
        { japanese: '肉', romaji: 'niku' },
        { japanese: '豆', romaji: 'mame' },
        { japanese: '箸', romaji: 'hasi' },
        { japanese: '旗', romaji: 'hata' },
        { japanese: '服', romaji: 'huku' },
        { japanese: '星', romaji: 'hosi' },
        { japanese: '胸', romaji: 'mune' },
        { japanese: '骨', romaji: 'hone' },
        { japanese: '肩', romaji: 'kata' },
        { japanese: '手', romaji: 'te' },
        { japanese: '店', romaji: 'mise' },
        { japanese: '紐', romaji: 'himo' },
        { japanese: '布', romaji: 'nuno' },
        { japanese: '山', romaji: 'yama' },
        { japanese: '桜', romaji: 'sakura' },
        { japanese: '川', romaji: 'kawa' },
        { japanese: '夜', romaji: 'yoru' },
        { japanese: '平和', romaji: 'heiwa' },
        { japanese: '空', romaji: 'sora' },
        { japanese: '海', romaji: 'umi' },
        { japanese: '森', romaji: 'mori' },
        { japanese: '冬', romaji: 'fuyu' },
        { japanese: '夢', romaji: 'yume' },
        { japanese: '歌', romaji: 'uta' },
        { japanese: '庭', romaji: 'niwa' },
        { japanese: '色', romaji: 'iro' },
        { japanese: '鳥', romaji: 'tori' },
        { japanese: '雲', romaji: 'kumo' },
        { japanese: '池', romaji: 'ike' },
        { japanese: '声', romaji: 'koe' },
        { japanese: '猿', romaji: 'saru' },
        { japanese: '船', romaji: 'hune' },
        { japanese: '春', romaji: 'haru' }
    ],
    hard: [
        { japanese: 'お茶', romaji: 'otya' }, { japanese: '医者', romaji: 'isya' }, { japanese: '会社', romaji: 'kaisya' },
        { japanese: '客', romaji: 'kyaku' }, { japanese: '九州', romaji: 'kyuusyuu' }, { japanese: '住所', romaji: 'juusyo' },
        { japanese: '著者', romaji: 'tyosya' }, { japanese: '辞書', romaji: 'jisyo' }, { japanese: '列車', romaji: 'ressya' },
        { japanese: '過去', romaji: 'kako' }, { japanese: '勉強', romaji: 'benkyou' }, { japanese: '集中', romaji: 'syuutyuu' },
        { japanese: '練習', romaji: 'rensyuu' }, { japanese: '執着', romaji: 'syuutyaku' }, { japanese: '余裕', romaji: 'yoyuu' },
        { japanese: '記者', romaji: 'kisya' }, { japanese: '救急', romaji: 'kyuukyuu' }, { japanese: '除去', romaji: 'jokyo' },
        { japanese: '首相', romaji: 'syusyou' }, { japanese: '業者', romaji: 'gyosya' }, { japanese: '拍手', romaji: 'hakusyu' },
        { japanese: '写真', romaji: 'syasin' }, { japanese: '趣味', romaji: 'syumi' }, { japanese: '終点', romaji: 'syuuten' },
        { japanese: '逆', romaji: 'gyaku' }, { japanese: '休暇', romaji: 'kyuuka' }, { japanese: '教授', romaji: 'kyouju' },
        { japanese: '略語', romaji: 'ryakugo' }, { japanese: '昨夜', romaji: 'sakuya' }, { japanese: '宿題', romaji: 'syukudai' },
        { japanese: '読書', romaji: 'dokusyo' }, { japanese: '特徴', romaji: 'tokutyou' }, { japanese: '視聴', romaji: 'sityou' },
        { japanese: '描写', romaji: 'byousya' }, { japanese: '雪', romaji: 'yuki' }, { japanese: '雲', romaji: 'kumo' },
        { japanese: '芋', romaji: 'imo' }, { japanese: '木', romaji: 'ki' }, { japanese: '門', romaji: 'mon' },
        { japanese: '飲み', romaji: 'nomi' }, { japanese: '読み', romaji: 'yomi' }, { japanese: '海', romaji: 'umi' },
        { japanese: '闇', romaji: 'yami' }, { japanese: '意味', romaji: 'imi' }, { japanese: '荷物', romaji: 'nimotsu' },
        { japanese: '飲み物', romaji: 'nomimono' }, { japanese: '遺言', romaji: 'yuigon' }, { japanese: '膿', romaji: 'umi' },
        { japanese: '桃', romaji: 'momo' }, { japanese: '濃い', romaji: 'koi' }, { japanese: '遺骨', romaji: 'ikotsu' },
        { japanese: '向こう', romaji: 'mukou' }, { japanese: '耳', romaji: 'mimi' }, { japanese: '明日', romaji: 'ashita' },
        { japanese: '汗', romaji: 'ase' }, { japanese: '餌', romaji: 'esa' }, { japanese: '枝', romaji: 'eda' },
        { japanese: '腕', romaji: 'ude' }, { japanese: '宛て', romaji: 'ate' }, { japanese: '勝て', romaji: 'kate' },
        { japanese: '捨て', romaji: 'sute' }, { japanese: 'さて', romaji: 'sate' }, { japanese: '座標', romaji: 'zahyou' },
        { japanese: '下', romaji: 'shita' }, { japanese: 'ただ', romaji: 'tada' }, { japanese: 'デカ', romaji: 'deka' },
        { japanese: '出せ', romaji: 'dase' }, { japanese: '鉄', romaji: 'tetsu' }, { japanese: '戦地', romaji: 'sentchi' },
        { japanese: '世田谷', romaji: 'setagaya' }, { japanese: '赤道', romaji: 'sekidou' }, { japanese: '手続き', romaji: 'tetuzuki' },
        { japanese: '徹底', romaji: 'tettei' }
    ]
};

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

    let isCorrect = false;

    // 1. 完全一致チェック
    if (targetRomaji.startsWith(newInput)) {
        isCorrect = true;
    } else {
        // 2. 特殊パターン代替チェック (si/shi, zi/ji など)
        const remaining = targetRomaji.substring(typingState.currentInput.length);
        const alternates = {
            'shi': 'si', 'si': 'shi',
            'chi': 'ti', 'ti': 'chi',
            'tsu': 'tu', 'tu': 'tsu',
            'fu': 'hu', 'hu': 'fu',
            'ji': 'zi', 'zi': 'ji',
            'sha': 'sya', 'sya': 'sha',
            'shu': 'syu', 'syu': 'shu',
            'sho': 'syo', 'syo': 'sho',
            'ja': 'zya', 'zya': 'ja',
            'ju': 'zyu', 'zyu': 'ju',
            'jo': 'zyo', 'zyo': 'jo'
        };

        for (let key in alternates) {
            if (remaining.startsWith(key)) {
                const altRemaining = alternates[key] + remaining.substring(key.length);
                if (altRemaining.startsWith(char)) {
                    isCorrect = true;
                    // 正解とするために、ターゲット単語のromaji自体を書き換えて一貫性を保つ
                    typingState.currentWord.romaji = typingState.currentInput + altRemaining;
                    elements.targetWord.textContent = typingState.currentWord.romaji;
                    break;
                }
            }
        }
    }

    if (isCorrect) {
        // 正解！
        typingState.currentInput = typingState.currentInput + char;
        gameState.combo++;

        // お金獲得・電力回復
        let charValue = getCharValue();

        // フィーバー中なら倍増（アップグレード反映）
        if (gameState.isFever) {
            const feverMult = upgradeConfig.comboMultiplier.getEffect(gameState.upgrades.comboMultiplier || 0);
            charValue *= feverMult;
        }

        gameState.money += charValue;
        gameState.sessionEarnings += charValue;
        gameState.correctChars++;

        // フィーバーチェック (10コンボで発動)
        if (gameState.combo >= 10 && !gameState.isFever) {
            startFever();
        }

        // 電力回復 (+0.5%)
        gameState.energy = Math.min(100, gameState.energy + 0.5);
        updateEnergyUI();

        // フィードバック
        elements.feedback.textContent = `+${Math.floor(charValue)}円！ ${gameState.combo} Combo!`;
        elements.feedback.style.color = difficultyConfig[gameState.difficulty].color;
        elements.userInput.textContent = typingState.currentInput;

        // 所持金をリアルタイム更新
        elements.moneyValue.textContent = formatMoney(Math.floor(gameState.money));

        // パーティクル
        createParticle(window.innerWidth / 2, window.innerHeight / 2, '💰');

        // 単語完成チェック
        if (typingState.currentInput === typingState.currentWord.romaji) {
            gameState.totalWords++;
            const bonus = Math.floor(charValue * 2);
            elements.feedback.textContent = `単語完成！ +${bonus}円ボーナス！`;

            // ボーナスも即座に加算
            gameState.money += bonus;
            gameState.sessionEarnings += bonus;
            elements.moneyValue.textContent = formatMoney(Math.floor(gameState.money));

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
    elements.moneyValue.textContent = formatMoney(gameState.money);
    elements.charValue.textContent = getCharValue() + '円/文字';
    elements.productionValue.textContent = formatMoney(Math.floor(gameState.totalProduction)) + '/秒';
    updateInventoryDisplay();
}

function updateSessionUI() {
    elements.moneyValue.textContent = formatMoney(gameState.money);
    elements.sessionEarnings.textContent = formatMoney(gameState.sessionEarnings);
    elements.correctChars.textContent = gameState.correctChars;
    elements.totalWords.textContent = gameState.totalWords;
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
