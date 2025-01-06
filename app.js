// ローカルストレージからデータを取得
function getData() {
  const data = localStorage.getItem('wordCardApp');
  const parsedData = data ? JSON.parse(data) : { wordBooks: [] };

  // 既存のデータに新しいプロパティを追加
  parsedData.wordBooks.forEach(wordBook => {
    wordBook.words.forEach(word => {
      if (!word.wordToMeaning) {
        word.wordToMeaning = { correctCount: 0, totalAttempts: 0, correctRate: 0 };
      }
      if (!word.meaningToWord) {
        word.meaningToWord = { correctCount: 0, totalAttempts: 0, correctRate: 0 };
      }
    });
  });

  return parsedData;
}

// ローカルストレージにデータを保存
function saveData(data) {
  localStorage.setItem('wordCardApp', JSON.stringify(data));
}

// 現在の単語帳ID
let currentWordBookId = null;

// テスト用の単語リスト
let testWords = [];
let correctAnswers = 0; // 正答数
let totalQuestions = 0; // 出題数
let testMode = "wordToMeaning"; // デフォルトのテストモード

// 単語帳リストを表示
function renderWordBookList() {
  const data = getData();
  const list = document.getElementById('wordBookList');
  list.innerHTML = '';
  data.wordBooks.forEach(wordBook => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.textContent = wordBook.name;
    link.addEventListener('click', () => openWordBook(wordBook.id));
    li.appendChild(link);
    list.appendChild(li);
  });
}

// 単語帳を開く
function openWordBook(wordBookId) {
  currentWordBookId = wordBookId;
  const data = getData();
  const wordBook = data.wordBooks.find(wb => wb.id === wordBookId);
  document.getElementById('wordBookTitle').textContent = wordBook.name;
  document.getElementById('wordBookManager').classList.add('hidden');
  document.getElementById('wordBookMode').classList.remove('hidden');
  renderWordList();
}

// 単語リストを表示
function renderWordList() {
  const data = getData();
  const wordBook = data.wordBooks.find(wb => wb.id === currentWordBookId);
  const list = document.getElementById('wordList');
  list.innerHTML = '';
  wordBook.words.forEach(word => {
    const wrongCountWordToMeaning = (word.wordToMeaning?.totalAttempts || 0) - (word.wordToMeaning?.correctCount || 0);
    const wrongCountMeaningToWord = (word.meaningToWord?.totalAttempts || 0) - (word.meaningToWord?.correctCount || 0);
    const li = document.createElement('li');
    li.classList.add('word-item');
    li.innerHTML = `
      <span class="question">${word.question}</span> -
      <span class="answer">${word.answer}</span>
      <span class="stats">
        単語→意味: 正答数: ${word.wordToMeaning?.correctCount || 0}, 誤答数: ${wrongCountWordToMeaning}, 正答率: ${word.wordToMeaning?.correctRate || 0}% |
        意味→単語: 正答数: ${word.meaningToWord?.correctCount || 0}, 誤答数: ${wrongCountMeaningToWord}, 正答率: ${word.meaningToWord?.correctRate || 0}%
      </span>
    `;
    list.appendChild(li);
  });
}

// 単語帳を作成
document.getElementById('createWordBook').addEventListener('click', () => {
  const name = prompt('単語帳の名前を入力してください:');
  if (name) {
    const data = getData();
    const newWordBook = {
      id: `wordBook${Date.now()}`,
      name: name,
      words: []
    };
    data.wordBooks.push(newWordBook);
    saveData(data);
    renderWordBookList();
  }
});

// 単語を追加
document.getElementById('addWord').addEventListener('click', () => {
  const question = document.getElementById('wordInput').value.trim();
  const answer = document.getElementById('meaningInput').value.trim();
  if (question && answer) {
    const data = getData();
    const wordBook = data.wordBooks.find(wb => wb.id === currentWordBookId);
    const newWord = {
      id: `word${Date.now()}`,
      question: question,
      answer: answer,
      wordToMeaning: { correctCount: 0, totalAttempts: 0, correctRate: 0 },
      meaningToWord: { correctCount: 0, totalAttempts: 0, correctRate: 0 }
    };
    wordBook.words.push(newWord);
    saveData(data);
    renderWordList();
    document.getElementById('wordInput').value = '';
    document.getElementById('meaningInput').value = '';
  }
});

// テストを開始
document.getElementById('startTest').addEventListener('click', () => {
  const data = getData();
  const wordBook = data.wordBooks.find(wb => wb.id === currentWordBookId);

  // テスト順序をセレクタから取得
  const order = document.getElementById('testOrder').value;
  if (order === 'order') {
    testWords = [...wordBook.words]; // 順序通り
  } else if (order === 'lowRate') {
    testWords = [...wordBook.words].sort((a, b) => {
      const aRate = testMode === 'wordToMeaning' ? a.wordToMeaning?.correctRate : a.meaningToWord?.correctRate;
      const bRate = testMode === 'wordToMeaning' ? b.wordToMeaning?.correctRate : b.meaningToWord?.correctRate;
      return (aRate || 0) - (bRate || 0);
    }); // 正答率が低い順
  } else if (order === 'random') {
    testWords = [...wordBook.words];
    shuffleArray(testWords); // ランダム
  }

  // テストモードをセレクタから取得
  testMode = document.getElementById('testModeSelect').value;

  correctAnswers = 0; // 正答数をリセット
  totalQuestions = testWords.length; // 出題数を設定
  if (testWords.length < 4) {
    alert('条件に合う単語が4つ以上必要です。');
    return;
  }

  document.getElementById('wordBookMode').classList.add('hidden');
  document.getElementById('testMode').classList.remove('hidden');
  document.getElementById('testEndMessage').classList.add('hidden');
  startTest();
});

// テストを終了
document.getElementById('endTest').addEventListener('click', () => {
  document.getElementById('testMode').classList.add('hidden');
  document.getElementById('wordBookMode').classList.remove('hidden');
  renderWordList(); // 単語帳画面に戻ったときに正答数と正答率を更新
});

// テストモード
function startTest() {
  if (testWords.length === 0) {
    const correctRate = Math.round((correctAnswers / totalQuestions) * 100);
    const messageDiv = document.getElementById('testEndMessage');
    messageDiv.classList.remove('hidden');

    // 正答率によるメッセージとスタイルの変更
    if (correctRate === 100) {
      messageDiv.textContent = `完璧です！素晴らしい！ 正答率: ${correctRate}%, 出題数: ${totalQuestions}`;
      messageDiv.className = 'perfect';
    } else if (correctRate >= 80) {
      messageDiv.textContent = `よくできました！ 正答率: ${correctRate}%, 出題数: ${totalQuestions}`;
      messageDiv.className = 'success';
    } else if (correctRate >= 50) {
      messageDiv.textContent = `もう少し頑張りましょう！ 正答率: ${correctRate}%, 出題数: ${totalQuestions}`;
      messageDiv.className = 'warning';
    } else {
      messageDiv.textContent = `頑張りましょう！ 正答率: ${correctRate}%, 出題数: ${totalQuestions}`;
      messageDiv.className = 'danger';
    }

    document.getElementById('choices').innerHTML = '';
    return;
  }

  const questionWord = testWords.pop(); // テスト用の単語を1つ取り出す
  const data = getData();
  const wordBook = data.wordBooks.find(wb => wb.id === currentWordBookId);
  const choices = [testMode === 'wordToMeaning' ? questionWord.answer : questionWord.question];
  while (choices.length < 4) {
    const randomWord = wordBook.words[Math.floor(Math.random() * wordBook.words.length)];
    const choice = testMode === 'wordToMeaning' ? randomWord.answer : randomWord.question;
    if (!choices.includes(choice)) {
      choices.push(choice);
    }
  }
  shuffleArray(choices);

  document.getElementById('question').textContent = testMode === 'wordToMeaning' ? questionWord.question : questionWord.answer;
  const choicesDiv = document.getElementById('choices');
  choicesDiv.innerHTML = '';
  choices.forEach(choice => {
    const button = document.createElement('button');
    button.textContent = choice;
    button.classList.add('test-choice');
    button.addEventListener('click', () => {
      const word = wordBook.words.find(w => w.id === questionWord.id);
      const modeData = testMode === 'wordToMeaning' ? word.wordToMeaning : word.meaningToWord;

      modeData.totalAttempts++;
      if (choice === (testMode === 'wordToMeaning' ? questionWord.answer : questionWord.question)) {
        alert('正解！');
        modeData.correctCount++;
        correctAnswers++;
      } else {
        alert('不正解...');
      }
      modeData.correctRate = Math.round((modeData.correctCount / modeData.totalAttempts) * 100);
      saveData(data);
      startTest();
    });
    choicesDiv.appendChild(button);
  });
}

// 配列をシャッフル
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// 初期化
document.getElementById('backToManager').addEventListener('click', () => {
  document.getElementById('wordBookMode').classList.add('hidden'); // 単語帳モードを非表示
  document.getElementById('wordBookManager').classList.remove('hidden'); // 単語帳管理モードを表示
});

renderWordBookList();

