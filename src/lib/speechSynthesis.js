let voices = [];

if (window.speechSynthesis) {
  if (speechSynthesis.addEventListener) {
    speechSynthesis.addEventListener('voiceschanged', () => {
      voices = speechSynthesis.getVoices();
    });
  } else {
    // In Safari, the speechSynthesis object isn't an event emitter, so
    // getVoices can be called without waiting for a voiceschanged event
    voices = speechSynthesis.getVoices();
  }
}

const speak = (text, language, rate = 0.7) => {
  const voice = voices.find(voice => voice.lang.startsWith(language));
  if (!voice) return Promise.resolve();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.rate = rate;
  return new Promise((resolve, reject) => {
    utterance.addEventListener('end', resolve);
    try {
      speechSynthesis.speak(utterance);
    } catch (e) {
      reject(e);
    }
  });
};

export { speak };
