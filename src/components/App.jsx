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

class App extends Component {
  responseInput = createRef();

  constructor(props) {
    super(props);
    const characterPosition = 0;
    const characterSet = 0;
    const language = 0;
    const { characters } = languages[language].data.characterSets[characterSet];
    const characterOrder = Object.keys(characters);
    this.state = {
      characterOrder,
      characterPosition,
      characterSet,
      language,
      response: '',
    };
  }

  componentDidUpdate() {
    this.responseInput.current && this.responseInput.current.focus();
  }

  getCharacterSet() {
    const characterSets = languages[this.state.language].data.characterSets;
    return characterSets[this.state.characterSet];
  }

  setCharacterSet(langIdx, characterSetIdx) {
    const language = languages[langIdx];
    const characterSet = language.data.characterSets[characterSetIdx];
    const characterOrder = Object.keys(characterSet.characters);
    this.setState({
      characterSet: characterSetIdx,
      characterOrder,
      characterPosition: 0,
      language: langIdx,
    });
  }

  getCharacter(position) {
    const characters = this.getCharacterSet().characters;
    const characterPosition =
      position === undefined ? this.state.characterPosition : position;
    const characterIndex = this.state.characterOrder[characterPosition];
    return characters[characterIndex];
  }

  advanceCharacter(from) {
    const characters = this.getCharacterSet().characters;
    let characterPosition =
      from === undefined ? this.state.characterPosition : from;
    characterPosition += 1;
    if (characterPosition < 0) {
      return Promise.resolve();
    }
    if (characterPosition === characters.length) {
      characterPosition = 0;
    }
    return new Promise(resolve =>
      this.setState({ characterPosition }, resolve)
    );
  }

  getIdProperty() {
    const characterSet = this.getCharacterSet();
    return characterSet.idProperty;
  }

  getQueryProperty() {
    const characterSet = this.getCharacterSet();
    return characterSet.queryProperty;
  }

  getSpokenProperty() {
    const characterSet = this.getCharacterSet();
    return characterSet.spokenProperty;
  }

  getDisplayProperty() {
    const characterSet = this.getCharacterSet();
    return characterSet.displayProperty;
  }

  getResponseProperty() {
    const characterSet = this.getCharacterSet();
    return characterSet.responseProperty;
  }

  speakCharacter() {
    const character = this.getCharacter();
    const language = languages[this.state.language];
    const property = this.getSpokenProperty();
    return speak(character[property], language.code);
  }

  proceedToNextCharacter() {
    // Sometimes the utterance doesn't trigger its end event, so
    // automatically advance after a fixed amount of time if that happens
    Promise.race([
      this.speakCharacter(),
      new Promise(resolve => setTimeout(resolve, 1000)),
    ]).then(() => {
      this.setState({ response: '' }, () => {
        this.advanceCharacter();
      });
    });
  }

  handleResponseInput = inputEvent => {
    this.setState({ response: inputEvent.target.value }, () => {
      const character = this.getCharacter();
      if (
        this.state.response.toLowerCase() ===
        character[this.getResponseProperty()].toLowerCase()
      ) {
        this.proceedToNextCharacter();
      }
    });
  };

  render() {
    return (
      <div>
        {languages.map((language, langIdx) =>
          language.data.characterSets.map((characterSet, characterSetIdx) => (
            <div
              key={`${language.name}:${characterSet.name}`}
              onClick={() => this.setCharacterSet(langIdx, characterSetIdx)}
            >
              {language.name} {characterSet.name}
            </div>
          ))
        )}
        {this.getCharacterSet().characters.map(character => (
          <span key={character[this.getIdProperty()]}>
            {character[this.getDisplayProperty()]}
          </span>
        ))}
        <label htmlFor="response-input">
          {this.getCharacter()[this.getQueryProperty()]}
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
