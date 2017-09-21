function getVoices(language) {
  return speechSynthesis.getVoices().filter(voice => voice.lang.startsWith(language));
}

function speak(text, language) {
  const voices = language instanceof Array ? language : getVoices(language);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voices[0];
  utterance.rate = 2 / 3;
  speechSynthesis.speak(utterance);
}

function speakIn(language) {
  const voices = getVoices(language);
  return function (text) {
    speak(text, voices);
  }
}

export {getVoices, speak, speakIn};
