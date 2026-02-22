// タイマー表示・操作要素の取得（存在チェック用）
const minutesDisplay = document.getElementById('minutes');
const secondsDisplay = document.getElementById('seconds');
const startStopBtn = document.getElementById('start-stop-btn');
const resetBtn = document.getElementById('reset-btn');
const presetBtns = document.querySelectorAll('.preset-btn');
const timerContainer = document.querySelector('.container');
const soundTypeSelect = document.getElementById('sound-type');

// タイマーの状態を一括管理
let state = {
    totalTime: 180,
    timeLeft: 180,
    isRunning: false,
    targetEndTime: 0
};

// localStorage から状態を読み込む
function loadState() {
    const savedState = localStorage.getItem('noodleTimerState');
    if (savedState) {
        state = JSON.parse(savedState);
        // 実行中の場合は、現在の時刻から残り時間を再計算
        if (state.isRunning) {
            const now = Date.now();
            if (now < state.targetEndTime) {
                state.timeLeft = Math.ceil((state.targetEndTime - now) / 1000);
            } else {
                state.timeLeft = 0;
            }
        }
    }
}

// localStorage に状態を保存
function saveState() {
    localStorage.setItem('noodleTimerState', JSON.stringify(state));
}

function updateDisplay(seconds) {
    if (minutesDisplay && secondsDisplay) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        minutesDisplay.textContent = mins.toString().padStart(2, '0');
        secondsDisplay.textContent = secs.toString().padStart(2, '0');
    }

    const blueLayer = document.getElementById('bg-blue');
    const yellowLayer = document.getElementById('bg-yellow');
    const redLayer = document.getElementById('bg-red');

    if (blueLayer && yellowLayer && redLayer && state.totalTime) {
        const progress = (state.totalTime - seconds) / state.totalTime;
        if (progress < 0.5) {
            blueLayer.style.opacity = 1 - (progress * 2);
            yellowLayer.style.opacity = progress * 2;
            redLayer.style.opacity = 0;
        } else {
            blueLayer.style.opacity = 0;
            yellowLayer.style.opacity = 1 - ((progress - 0.5) * 2);
            redLayer.style.opacity = (progress - 0.5) * 2;
        }
    }
}

function syncUI() {
    updateDisplay(state.timeLeft);
    if (startStopBtn) {
        startStopBtn.textContent = state.isRunning ? 'STOP' : 'START';
    }

    // プリセットボタンのアクティブ状態を更新
    if (presetBtns) {
        presetBtns.forEach(btn => {
            if (parseInt(btn.dataset.time) === state.totalTime) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    if (state.isRunning) {
        if (!countdown) {
            startInterval();
        }
    } else {
        if (countdown) {
            clearInterval(countdown);
            countdown = null;
        }
        if (timerContainer) {
            if (state.timeLeft === 0 && !alarmTimer) {
                timerContainer.classList.add('timer-finished');
            } else if (state.timeLeft > 0) {
                timerContainer.classList.remove('timer-finished');
            }
        }
    }
}

function startInterval() {
    if (countdown) clearInterval(countdown);
    countdown = setInterval(() => {
        const now = Date.now();
        if (state.isRunning) {
            const remaining = Math.ceil((state.targetEndTime - now) / 1000);
            if (remaining <= 0) {
                state.timeLeft = 0;
                state.isRunning = false;
                saveState();
                syncUI();
                playFinishSound();
            } else {
                state.timeLeft = remaining;
                updateDisplay(state.timeLeft);
            }
        }
    }, 100);
}

function startTimer() {
    loadState();
    if (state.isRunning || alarmTimer) {
        stopAlarm();
        if (state.isRunning) {
            state.isRunning = false;
            state.timeLeft = Math.max(0, Math.ceil((state.targetEndTime - Date.now()) / 1000));
            saveState();
            syncUI();
            return;
        }
    }

    if (state.timeLeft <= 0) return;

    state.isRunning = true;
    state.targetEndTime = Date.now() + (state.timeLeft * 1000);
    saveState();
    syncUI();
}

function resetTimer() {
    stopAlarm();
    state.isRunning = false;
    state.timeLeft = state.totalTime || 180;
    state.totalTime = state.timeLeft;
    saveState();
    syncUI();
}

function setPreset(seconds) {
    stopAlarm();
    state.isRunning = false;
    state.totalTime = seconds;
    state.timeLeft = seconds;
    saveState();
    syncUI();
}

function playFinishSound() {
    if (alarmTimer || !soundTypeSelect) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const soundType = soundTypeSelect.value;
    if (timerContainer) timerContainer.classList.add('timer-finished');

    const runAlarm = () => {
        if (soundType === 'silent') {
        } else if (soundType.startsWith('custom')) {
            if (!customAudio) {
                const baseName = `alarm${soundType.replace('custom', '')}`;
                customAudio = new Audio();
                const sources = [`sounds/${baseName}.mp3`, `sounds/${baseName}.wav`];
                let sourceIndex = 0;

                const tryNextSource = () => {
                    if (sourceIndex < sources.length) {
                        customAudio.src = sources[sourceIndex];
                        sourceIndex++;
                        customAudio.play().catch(() => tryNextSource());
                    }
                };
                customAudio.loop = true;
                tryNextSource();
            }
        }
        if ("vibrate" in navigator) {
            navigator.vibrate([200, 100, 200]);
        }
    };

    runAlarm();
    alarmTimer = setInterval(runAlarm, 1000);
}

function stopAlarm() {
    if (alarmTimer) {
        clearInterval(alarmTimer);
        alarmTimer = null;
    }
    if (audioCtx) {
        audioCtx.close().catch(() => { });
        audioCtx = null;
    }
    if (customAudio) {
        customAudio.pause();
        customAudio.currentTime = 0;
        customAudio = null;
    }
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    if (timerContainer) timerContainer.classList.remove('timer-finished');
}

if (presetBtns) {
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => setPreset(parseInt(btn.dataset.time)));
    });
}

if (startStopBtn) startStopBtn.addEventListener('click', startTimer);
if (resetBtn) resetBtn.addEventListener('click', resetTimer);

if (soundTypeSelect) {
    soundTypeSelect.addEventListener('change', () => {
        stopAlarm();
        const soundType = soundTypeSelect.value;
        if (soundType === 'silent') return;

        if (soundType.startsWith('custom')) {
            const baseName = `alarm${soundType.replace('custom', '')}`;
            const previewAudio = new Audio();
            const sources = [`sounds/${baseName}.mp3`, `sounds/${baseName}.wav`];
            let sourceIndex = 0;

            const tryNextSource = () => {
                if (sourceIndex < sources.length) {
                    previewAudio.src = sources[sourceIndex];
                    sourceIndex++;
                    previewAudio.play().then(() => {
                        setTimeout(() => {
                            previewAudio.pause();
                            previewAudio.currentTime = 0;
                        }, 3000);
                    }).catch(() => tryNextSource());
                }
            };
            tryNextSource();
        }
    });
}

window.addEventListener('storage', (e) => {
    if (e.key === 'noodleTimerState') {
        loadState();
        syncUI();
    }
});

// 初期化
loadState();
syncUI();

if (window.speechSynthesis) {
    window.speechSynthesis.getVoices();
}
