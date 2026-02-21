let countdown;
let timeLeft;
let totalTime;
let isRunning = false;
let alarmTimer;
let audioCtx;
let customAudio;

const minutesDisplay = document.getElementById('minutes');
const secondsDisplay = document.getElementById('seconds');
const startStopBtn = document.getElementById('start-stop-btn');
const resetBtn = document.getElementById('reset-btn');
const presetBtns = document.querySelectorAll('.preset-btn');
const timerContainer = document.querySelector('.container');
const soundTypeSelect = document.getElementById('sound-type');

function updateDisplay(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    minutesDisplay.textContent = mins.toString().padStart(2, '0');
    secondsDisplay.textContent = secs.toString().padStart(2, '0');

    if (totalTime) {
        const progress = (totalTime - seconds) / totalTime;
        const blueLayer = document.getElementById('bg-blue');
        const yellowLayer = document.getElementById('bg-yellow');
        const redLayer = document.getElementById('bg-red');

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

function startTimer() {
    if (isRunning || alarmTimer) {
        stopAlarm();
        if (isRunning) {
            clearInterval(countdown);
            startStopBtn.textContent = 'START';
            isRunning = false;
            return;
        }
    }

    if (!timeLeft) return;

    isRunning = true;
    startStopBtn.textContent = 'STOP';

    countdown = setInterval(() => {
        timeLeft--;
        updateDisplay(timeLeft);

        if (timeLeft <= 0) {
            clearInterval(countdown);
            isRunning = false;
            startStopBtn.textContent = 'START';
            timeLeft = 0;
            timerContainer.classList.add('timer-finished');
            playFinishSound();
        }
    }, 1000);
}

function resetTimer() {
    stopAlarm();
    clearInterval(countdown);
    isRunning = false;
    startStopBtn.textContent = 'START';
    timerContainer.classList.remove('timer-finished');
    if (totalTime) {
        timeLeft = totalTime;
        updateDisplay(timeLeft);
    } else {
        timeLeft = 180;
        totalTime = 180;
        updateDisplay(timeLeft);
    }
    document.getElementById('bg-blue').style.opacity = 1;
    document.getElementById('bg-yellow').style.opacity = 0;
    document.getElementById('bg-red').style.opacity = 0;
}

function setPreset(seconds) {
    stopAlarm();
    clearInterval(countdown);
    isRunning = false;
    startStopBtn.textContent = 'START';
    timerContainer.classList.remove('timer-finished');

    totalTime = seconds;
    timeLeft = seconds;
    updateDisplay(timeLeft);
    document.getElementById('bg-blue').style.opacity = 1;
    document.getElementById('bg-yellow').style.opacity = 0;
    document.getElementById('bg-red').style.opacity = 0;

    presetBtns.forEach(btn => {
        if (parseInt(btn.dataset.time) === seconds) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function speakMessage(text) {
    const synth = window.speechSynthesis;
    if (!synth) return;

    // 現在の読み上げをキャンセル
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 1.2;
    utterance.pitch = 1.0;

    const voices = synth.getVoices();
    const jaVoice = voices.find(v => v.lang === 'ja-JP' || v.lang === 'ja_JP');
    if (jaVoice) utterance.voice = jaVoice;

    synth.speak(utterance);
}

function playBeep(ctx, time, frequency, duration, volume = 0.5, type = 'sine') {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(volume, time + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);
    oscillator.start(time);
    oscillator.stop(time + duration);
}

function playFinishSound() {
    if (alarmTimer) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const soundType = soundTypeSelect.value;

    const runAlarm = () => {
        const now = audioCtx.currentTime;

        if (soundType === 'silent') {
            // 無音の場合は何もしない（バイブレーションのみ）
        } else if (soundType.startsWith('custom')) {
            if (!customAudio) {
                const baseName = `alarm${soundType.replace('custom', '')}`;
                // まず mp3 を試して、ダメなら wav を試す
                customAudio = new Audio();
                const sources = [`sounds/${baseName}.mp3`, `sounds/${baseName}.wav`];
                let sourceIndex = 0;

                const tryNextSource = () => {
                    if (sourceIndex < sources.length) {
                        customAudio.src = sources[sourceIndex];
                        sourceIndex++;
                        customAudio.play().catch(e => {
                            console.log(`Failed to play ${sources[sourceIndex - 1]}, trying next...`);
                            tryNextSource();
                        });
                    } else {
                        console.error("No valid audio file found for", baseName);
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
    alarmTimer = setInterval(runAlarm, 1000); // 2秒から1秒に変更して、よりアラームらしく
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
    timerContainer.classList.remove('timer-finished');
}

presetBtns.forEach(btn => {
    btn.addEventListener('click', () => setPreset(parseInt(btn.dataset.time)));
});

startStopBtn.addEventListener('click', startTimer);
resetBtn.addEventListener('click', resetTimer);

soundTypeSelect.addEventListener('change', () => {
    // すでに動いているアラームやプレビューを止める
    stopAlarm();

    const soundType = soundTypeSelect.value;
    if (soundType === 'silent') return;

    if (soundType.startsWith('custom')) {
        const baseName = `alarm${soundType.replace('custom', '')}`;
        customAudio = new Audio();
        const sources = [`sounds/${baseName}.mp3`, `sounds/${baseName}.wav`];
        let sourceIndex = 0;

        const tryNextSource = () => {
            if (sourceIndex < sources.length) {
                customAudio.src = sources[sourceIndex];
                sourceIndex++;
                customAudio.play().then(() => {
                    // プレビューなので3秒後に止める
                    setTimeout(() => {
                        if (customAudio && !alarmTimer) {
                            customAudio.pause();
                            customAudio.currentTime = 0;
                            customAudio = null;
                        }
                    }, 3000);
                }).catch(e => {
                    tryNextSource();
                });
            }
        };
        tryNextSource();
    }
});

setPreset(180);

// 音声リストを初期化するためのダミー呼び出し（ブラウザによっては必要）
window.speechSynthesis.getVoices();
