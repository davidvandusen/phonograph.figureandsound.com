import '../styles/app.css';

// noinspection ES6UnusedImports
import { Component, createRef, h } from 'preact';
import { speak } from '../lib/speechSynthesis';
import languages from '../data/languages/index.json';
import elGR from '../data/languages/el-GR.json';
import jaJP from '../data/languages/ja-JP.json';

const languageData = {
  'el-GR': elGR,
  'ja-JP': jaJP,
};

languages.forEach(language => {
  language.data = languageData[language.code];
});

const getCharacterSetState = (languageIndex, characterSetIndex) => {
  const language = languages[languageIndex];
  const characterSet = language.data.characterSets[characterSetIndex];
  const characterOrder = Object.keys(characterSet.characters);
  const characterPosition = 0;
  return {
    characterOrder,
    characterPosition,
    characterSet,
    language,
  };
};

class App extends Component {
  responseInput = createRef();

  constructor(props) {
    super(props);
    this.state = {
      ...getCharacterSetState(0, 0),
      response: '',
    };
  }

  componentDidUpdate() {
    this.responseInput.current && this.responseInput.current.focus();
  }

  setCharacterSet(languageIndex, characterSetIndex) {
    this.setState(getCharacterSetState(languageIndex, characterSetIndex));
  }

  getCharacter() {
    const characterIndex =
      this.state.characterOrder[this.state.characterPosition];
    return this.state.characterSet.characters[characterIndex];
  }

  advanceCharacter = () => {
    let { characterPosition } = this.state;
    if (characterPosition === this.state.characterSet.characters.length - 1) {
      characterPosition = 0;
    } else {
      characterPosition += 1;
    }
    this.setState({ characterPosition });
  }

  speakCharacter() {
    const character = this.getCharacter();
    const spokenProperty = this.state.characterSet.spokenProperty;
    return speak(character[spokenProperty], this.state.language.code);
  }

  proceedToNextCharacter() {
    // Sometimes the utterance doesn't trigger its end event, so
    // automatically advance after a fixed amount of time if that happens
    Promise.race([
      this.speakCharacter(),
      new Promise(resolve => setTimeout(resolve, 1000)),
    ]).then(() => {
      this.setState({ response: '' }, this.advanceCharacter);
    });
  }

  handleResponseInput = inputEvent => {
    this.setState({ response: inputEvent.target.value }, () => {
      const character = this.getCharacter();
      if (
        this.state.response.toLowerCase() ===
        character[this.state.characterSet.responseProperty].toLowerCase()
      ) {
        this.proceedToNextCharacter();
      }
    });
  };

  render() {
    return (
      <div>
        {languages.map((language, languageIndex) =>
          language.data.characterSets.map((characterSet, characterSetIndex) => (
            <div
              key={`${language.name}:${characterSet.name}`}
              onClick={() =>
                this.setCharacterSet(languageIndex, characterSetIndex)
              }
            >
              {language.name} {characterSet.name}
            </div>
          ))
        )}
        {this.state.characterSet.characters.map(character => (
          <span key={character[this.state.characterSet.idProperty]}>
            {character[this.state.characterSet.displayProperty]}
          </span>
        ))}
        <label htmlFor="response-input">
          {this.getCharacter()[this.state.characterSet.queryProperty]}
        </label>
        <input
          id="response-input"
          value={this.state.response}
          ref={this.responseInput}
          onInput={this.handleResponseInput}
        />
      </div>
    );
  }
}

export default App;
