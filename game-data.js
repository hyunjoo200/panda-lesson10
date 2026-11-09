/* =====================================================================
   중국어 탐험대 · 10차시 「판다네 집, 我喜欢!」 — 설정 파일 (game-data.js)
   ---------------------------------------------------------------------
   선생님이 고쳐도 되는 곳은 이 파일뿐입니다. (온라인 연결은 firebase-config.js)
   - 따옴표(' ') 안의 글자만 바꾸고, 쉼표(,)와 괄호는 지우지 마세요.
   - 사진은 img 폴더에 있어요. (10차시 PPT 사진 + 9차시 음식 사진 몇 장)
   ===================================================================== */

window.GAME_DATA = {

  lessonId: 'lesson10',             // 선생님 화면 '차시' 칸에 이 글자를 써요
  saveKey: 'panda-lesson10',
  stageLabel: '10차시 복습',
  title: '판다네 집, 我喜欢!',
  subtitle: '你喜欢什么？',
  story: [
    '오늘은 판다네 집에서 우리 반 밸런스 게임 대회가 열려요!',
    '방마다 두 가지 중 좋아하는 것을 골라요. 정답은 없어요! 대신 "우리 반 친구들은 뭘 더 많이 골랐을까?"를 맞히면 코인을 받아요.',
    '모은 코인으로 뽑기를 돌려 판다를 꾸며요. 준비됐나요? 你喜欢什么？'
  ],

  /* 점수 · pick: 좋아하는 것을 고를 때마다 받는 별 */
  points: { firstTry: 100, retry: 60, pick: 10, predict: 20 },

  /* 코인 · gachaCost: 뽑기 한 번 · fast: 5초 안에 고르면 · predict: 반 다수 맞히면 · quiz: 문제를 처음에 맞히면 · quizRetry: 다시 풀어 맞히면 · room: 방 꾸미기 완료 */
  coins: { gachaCost: 4, fast: 1, predict: 2, quiz: 2, quizRetry: 1, room: 1, start: 2 },
  pickSeconds: 5,      // 밸런스 게임 고르는 시간 (지나도 괜찮아요, 번개 보너스만 없어져요)
  predictSeconds: 6,   // 반 다수 예측 시간

  /* 뽑기 아이템 · slot: head(머리) / face(얼굴) / hold(손) · rare: 1 일반 · 2 희귀 · 3 전설 */
  gacha: [
    { id: 'ribbon',  e: '🎀', name: '리본',     slot: 'head', rare: 1 },
    { id: 'cap',     e: '🧢', name: '야구 모자', slot: 'head', rare: 1 },
    { id: 'flower',  e: '🌸', name: '벚꽃 핀',   slot: 'head', rare: 1 },
    { id: 'tophat',  e: '🎩', name: '마술 모자', slot: 'head', rare: 2 },
    { id: 'grad',    e: '🎓', name: '학사모',    slot: 'head', rare: 2 },
    { id: 'crown',   e: '👑', name: '황금 왕관', slot: 'head', rare: 3 },
    { id: 'glasses', e: '👓', name: '동글 안경', slot: 'face', rare: 1 },
    { id: 'shades',  e: '🕶️', name: '선글라스',  slot: 'face', rare: 2 },
    { id: 'balloon', e: '🎈', name: '풍선',      slot: 'hold', rare: 1 },
    { id: 'candy',   e: '🍭', name: '막대사탕',  slot: 'hold', rare: 1 },
    { id: 'ball',    e: '⚽', name: '축구공',    slot: 'hold', rare: 1 },
    { id: 'guitar',  e: '🎸', name: '기타',      slot: 'hold', rare: 2 },
    { id: 'bamboo',  e: '🎋', name: '황금 대나무', slot: 'hold', rare: 2 },
    { id: 'rainbow', e: '🌈', name: '무지개',    slot: 'hold', rare: 3 }
  ],

  /* ---------- 낱말 (사진: img/아이디.jpg) · kr: 한글 발음 · ko: 뜻 ---------- */
  words: {
    mama:       { text: '妈妈',     pinyin: 'māma',        kr: '마마',        ko: '엄마' },
    pengyou:    { text: '朋友',     pinyin: 'péngyou',     kr: '펑여우',      ko: '친구' },
    xiongmao:   { text: '熊猫',     pinyin: 'xióngmāo',    kr: '슝마오',      ko: '판다' },
    mao:        { text: '猫',       pinyin: 'māo',         kr: '마오',        ko: '고양이' },
    jiaozi:     { text: '饺子',     pinyin: 'jiǎozi',      kr: '자오쯔',      ko: '교자' },
    malatang:   { text: '麻辣烫',   pinyin: 'málàtàng',    kr: '마라탕',      ko: '마라탕' },
    shuxue:     { text: '数学',     pinyin: 'shùxué',      kr: '수쉐',        ko: '수학' },
    tiyu:       { text: '体育',     pinyin: 'tǐyù',        kr: '티위',        ko: '체육' },
    meishu:     { text: '美术',     pinyin: 'měishù',      kr: '메이수',      ko: '미술' },
    qingtian:   { text: '晴天',     pinyin: 'qíngtiān',    kr: '칭톈',        ko: '맑은 날' },
    xuetian:    { text: '雪天',     pinyin: 'xuětiān',     kr: '쉐톈',        ko: '눈 오는 날' },
    yutian:     { text: '雨天',     pinyin: 'yǔtiān',      kr: '위톈',        ko: '비 오는 날' },
    tizuqiu:    { text: '踢足球',   pinyin: 'tī zúqiú',    kr: '티 주치우',   ko: '축구하기' },
    dalanqiu:   { text: '打篮球',   pinyin: 'dǎ lánqiú',   kr: '다 란치우',   ko: '농구하기' },
    dayumaoqiu: { text: '打羽毛球', pinyin: 'dǎ yǔmáoqiú', kr: '다 위마오치우', ko: '배드민턴 치기' },
    youyong:    { text: '游泳',     pinyin: 'yóuyǒng',     kr: '여우융',      ko: '수영하기' },
    tingyinyue: { text: '听音乐',   pinyin: 'tīng yīnyuè', kr: '팅 인웨',     ko: '음악 듣기' },
    huahua:     { text: '画画',     pinyin: 'huàhuà',      kr: '화화',        ko: '그림 그리기' },
    // 9차시 음식 (주방 냉장고 문제)
    guotie:     { text: '锅贴',     pinyin: 'guōtiē',      kr: '궈톄',        ko: '군만두' },
    baozi:      { text: '包子',     pinyin: 'bāozi',       kr: '바오쯔',      ko: '바오쯔 (속 있는 찐빵)' }
  },

  /* ---------- 문장 소리 (낱말 소리와 "我喜欢○○。" 문장은 위 words에서 자동으로 만들어요) ---------- */
  audio: {
    useLocalFiles: true,
    useOnlineVoice: true,
    onlineVoiceUrl: 'https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-CN&client=tw-ob&q=',
    slowRate: 0.7,
    sounds: {
      nixihuan:   { text: '你喜欢什么？', pinyin: 'Nǐ xǐhuan shénme?' },
      nixiangchi: { text: '你想吃什么？', pinyin: 'Nǐ xiǎng chī shénme?' },
      nine:       { text: '你呢？',       pinyin: 'Nǐ ne?' },
      woshishei:  { text: '我是谁？',     pinyin: 'Wǒ shì shéi?' },
      nihao:      { text: '你好',         pinyin: 'nǐ hǎo' },
      xiexie:     { text: '谢谢',         pinyin: 'xièxie' },
      zaijian:    { text: '再见',         pinyin: 'zàijiàn' },
      henhaochi:  { text: '很好吃！',     pinyin: 'Hěn hǎochī!' }
    }
  },

  /* ---------- 판다네 집의 방 ----------
     floor: 1(아래층) / 2(위층) · deco: 방 꾸미기 그림 · choices: 밸런스 게임 두 가지 (정답 없음, PPT 밸런스 게임과 같아요)
     mission: 고른 뒤에 나오는 문제 (채점)
       order   : 我 喜欢 (고른 것) 순서 맞추기 — 想·吃 조각이 섞여 있어요
       ask     : 판다가 한 질문을 듣고 무슨 뜻인지 고르기 (喜欢 / 想吃 헷갈리기)
       pickWord: 사진을 보고 알맞은 말 고르기
       hearPhoto: 문장을 듣고 사진 고르기
       verb    : 빈칸에 알맞은 동사(踢/打) 고르기
       situation: 상황에 맞는 문장 고르기 (我喜欢… / 我想吃…)                         */
  rooms: [
    { id: 'living', name: '거실', cat: '취미', floor: 1, icon: '🛋️', wall: '#ffe3d6', floorc: '#e8b98f', deco: ['🛋️', '📺', '🪴'],
      choices: ['tingyinyue', 'huahua'],
      mission: { id: 'q1', type: 'order', place: '거실',
        question: '판다에게 말해요. 조각을 순서대로 눌러 "나는 ○○를 좋아해"를 만들어요.',
        extra: ['想', '吃'],
        hint: '나(我) → 좋아하다(喜欢) → 좋아하는 것 순서예요. 想吃는 "먹고 싶다"라서 여기엔 안 맞아요.' } },
    { id: 'bedroom', name: '내 방', cat: '동물', floor: 2, icon: '🧸', wall: '#e3e9ff', floorc: '#c8b29a', deco: ['🛏️', '🧸', '🪟'],
      choices: ['xiongmao', 'mao'],
      mission: { id: 'q2', type: 'ask', place: '내 방', sound: 'nixihuan',
        question: '판다가 중국어로 물어봐요. 무엇을 물어본 걸까요?',
        options: [ { text: '뭐 좋아해?', correct: true }, { text: '뭐 먹고 싶어?' }, { text: '이름이 뭐야?' } ],
        hint: '喜欢 xǐhuan은 "좋아하다", 想吃 xiǎng chī는 "먹고 싶다"예요. 잘 듣고 喜欢이 들리는지 확인해요.' } },
    { id: 'study', name: '공부방', cat: '과목', floor: 2, icon: '📚', wall: '#e5f6e8', floorc: '#c9a77e', deco: ['📚', '✏️', '🖥️'],
      choices: ['tiyu', 'meishu'],
      mission: { id: 'q3', type: 'pickWord', place: '공부방', photo: 'meishu',
        question: '친구 판다가 좋아하는 과목 사진을 보여 줘요. 친구는 이렇게 말해요. 我喜欢 ___。',
        options: ['shuxue', 'tiyu', 'meishu'], answer: 'meishu',
        hint: '물감과 붓으로 그림을 그리는 시간은 美术 měishù예요.' } },
    { id: 'balcony', name: '베란다', cat: '날씨', floor: 2, icon: '🪟', wall: '#fff6d8', floorc: '#bfb3a5', deco: ['🪴', '🌻', '🪑'],
      choices: ['qingtian', 'xuetian'],
      mission: { id: 'q4', type: 'hearPhoto', place: '베란다', sound: 'like_xuetian',
        question: '아기 판다가 좋아하는 날씨를 말해요. 어떤 날씨일까요?',
        options: ['qingtian', 'xuetian', 'yutian'], answer: 'xuetian',
        hint: '雪 xuě는 "눈"이에요. 雨 yǔ는 "비", 晴 qíng은 "맑다".' } },
    { id: 'yard', name: '마당', cat: '운동', floor: 1, icon: '⚽', wall: '#dff3ff', floorc: '#9fd27a', deco: ['🌳', '🥅', '🌼'],
      choices: ['tizuqiu', 'dayumaoqiu'],
      mission: { id: 'q5', type: 'verb', place: '마당', photo: 'tizuqiu',
        sentence: ['我喜欢', '足球。'],
        question: '축구공은 발로 뻥! 빈칸에 알맞은 말은?',
        options: [ { text: '踢', sub: 'tī', kr: '티 · 발로 차다', correct: true }, { text: '打', sub: 'dǎ', kr: '다 · 손으로 치다' } ],
        hint: '발로 차는 축구는 踢 tī, 손이나 라켓으로 하는 농구·배드민턴은 打 dǎ예요.' } },
    { id: 'kitchen', name: '주방', cat: '음식', floor: 1, icon: '🍳', wall: '#fff0e0', floorc: '#d9b48c', deco: ['🍳', '🧊', '🍚'],
      choices: ['jiaozi', 'malatang'],
      mission: { id: 'q6', type: 'situation', place: '주방',
        question: '꼬르륵~ 배가 너무 고파요! 지금 바로 먹고 싶을 때 하는 말은?',
        hint: '我想吃는 "(지금) 먹고 싶어요", 我喜欢는 "(평소에) 좋아해요"예요. 지금 배고프니까…?' },
      mission2: { id: 'q7', type: 'pickWord', place: '주방 냉장고', photo: 'guotie',
        question: '냉장고 안에 지난 시간 야시장에서 본 음식이 있어요! 이 음식의 이름은?',
        options: ['guotie', 'jiaozi', 'baozi'], answer: 'guotie',
        hint: '바닥을 노릇하게 구운 군만두는 锅贴 guōtiē예요. 饺子는 물에 삶은 교자예요.' } }
  ],

  /* ---------- 깜짝 손님: 엄마 판다 (두 번째 방을 마치고 나오면 나타나요) ---------- */
  mom: {
    after: 2,
    mission: { id: 'q8', type: 'hearPhoto', place: '깜짝 손님', sound: 'mama',
      question: '띵동! 누가 왔어요. "我是谁？ 나는 누구게?" 소리를 듣고 골라요.',
      options: ['mama', 'mao', 'xiongmao'], answer: 'mama',
      hint: '妈妈 māma는 "마마", 猫 māo는 "마오", 熊猫는 "슝마오"예요. 마지막 소리를 잘 들어 봐요.' },
    choices: ['mama', 'pengyou'],
    pickQuestion: '엄마 판다가 웃으며 물어요. "你喜欢什么？" 누가 좋아?'
  }
};

/* (고치지 마세요) 선생님 화면이 문제 목록을 읽는 부분 */
window.GAME_DATA.zones = window.GAME_DATA.rooms.map(r => ({ id: r.id, name: r.name, missions: [r.mission].concat(r.mission2 ? [r.mission2] : []) }))
  .concat([{ id: 'mom', name: '깜짝 손님', missions: [window.GAME_DATA.mom.mission] }]);
