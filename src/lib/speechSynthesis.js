const speak = (text, language, rate = 0.7) => {
  const voices = speechSynthesis
    .getVoices()
    .filter(voice => voice.lang.startsWith(language));
  if (voices.length === 0) {
    return Promise.resolve();
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voices[0];
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
