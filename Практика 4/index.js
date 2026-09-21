// ===== Переключение вкладок =====
function showScreen(screenName) {
    let counterScreen = document.getElementById('screenCounter');
    let lotoScreen = document.getElementById('screenLoto');
    let counterTab = document.getElementById('tabCounterBtn');
    let lotoTab = document.getElementById('tabLotoBtn');

    if (screenName === 'counter') {
      counterScreen.classList.add('active');
      lotoScreen.classList.remove('active');
      counterTab.classList.add('active');
      lotoTab.classList.remove('active');
    } else {
      lotoScreen.classList.add('active');
      counterScreen.classList.remove('active');
      lotoTab.classList.add('active');
      counterTab.classList.remove('active');
    }
  }

  // ===== Приложение "Счетчик" =====
  let count = 0;

  function updateDisplay() {
    let display = document.getElementById('count');
    display.textContent = count;

    if (count > 0) {
      display.style.color = 'var(--green)';
    } else if (count < 0) {
      display.style.color = 'var(--red)';
    } else {
      display.style.color = 'var(--gray)';
    }

    display.classList.add('bump');
    setTimeout(function () {
      display.classList.remove('bump');
    }, 150);
  }

  function increase() {
    count = count + 1;
    updateDisplay();
  }

  function decrease() {
    count = count - 1;
    updateDisplay();
  }

  function reset() {
    count = 0;
    updateDisplay();
  }

  updateDisplay();

  // ===== Приложение "Лото" =====
  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function formatNumber(num) {
    if (num < 10) {
      return '0' + num;
    } else {
      return '' + num;
    }
  }

  function playLoto() {
    let ballsContainer = document.getElementById('balls');
    ballsContainer.innerHTML = '';

    for (let i = 1; i <= 6; i++) {
      let num = getRandomInt(1, 99);

      let ball = document.createElement('div');
      ball.className = 'ball';
      ball.textContent = formatNumber(num);
      ball.style.animationDelay = (i * 0.08) + 's';

      ballsContainer.appendChild(ball);
    }
  }