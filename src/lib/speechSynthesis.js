function getVoices(language) {
  return speechSynthesis
    .getVoices()
    .filter(voice => voice.lang.startsWith(language));
}

function speak(text, language) {
  const voices = language instanceof Array ? language : getVoices(language);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voices[0];
  utterance.rate = 2 / 3;
  return new Promise((resolve, reject) => {
    utterance.addEventListener('end', resolve);
    try {
      speechSynthesis.speak(utterance);
    } catch (e) {
      reject(e);
    }
  });
}

export { speak };
