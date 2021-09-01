import '../styles/app.css';

import { Component, createRef, Fragment, h } from 'preact';
import { speak } from '../lib/speechSynthesis';
import languages from '../data/languages/index.json';
import greek from '../data/languages/el-GR.json';
import japanese from '../data/languages/ja-JP.json';

const languageData = [greek, japanese];

languages.forEach(language => {
  language.data = languageData.find(data => data.code === language.code);
});

class App extends Component {
  constructor(props) {
    super(props);
    this.responseInput = createRef();
    this.state = {
      languages,
      language: null,
      characterSet: null,
      characterPosition: null,
      characterOrder: null,
      response: '',
      hasSpeech: false,
    };
  }

  componentDidMount() {
    new Promise(resolve =>
      speechSynthesis.addEventListener('voiceschanged', resolve)
    ).then(() => {
      this.setState({ hasSpeech: true });
    });
  }

  componentDidUpdate() {
    this.responseInput.current && this.responseInput.current.focus();
  }

  getLanguage() {
    return this.state.languages[this.state.language];
  }

  getCharacterSets() {
    const language = this.getLanguage();
    return language.data.characterSets;
  }

  getCharacterSet() {
    const characterSets = this.getCharacterSets();
    return characterSets[this.state.characterSet];
  }

  setCharacterSet(langIdx, characterSetIdx) {
    this.setState({ language: langIdx }, () => {
      const characterSets = this.getCharacterSets();
      const characterSet = characterSets[characterSetIdx];
      const characterOrder = Object.keys(characterSet.characters);
      this.setState({
        characterSet: characterSetIdx,
        characterOrder,
        characterPosition: null,
      });
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
    if (characterPosition === null) {
      characterPosition = 0;
    } else {
      characterPosition += 1;
    }
    if (characterPosition < 0) {
      return Promise.resolve();
    }
    if (characterPosition === characters.length) {
      characterPosition = null;
    }
    return new Promise(resolve =>
      this.setState({ characterPosition }, resolve)
    );
  }

  startQuiz = () => {
    this.advanceCharacter(null);
  };

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
    if (this.state.characterPosition === null) return Promise.resolve();
    const character = this.getCharacter();
    const language = this.getLanguage();
    const property = this.getSpokenProperty();
    return speak(character[property], language.code);
  }

  moveToNextCharacter() {
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
        this.moveToNextCharacter();
      }
    });
  };

  getCharacterAt(rowValue, columnValue) {
    const characterSet = this.getCharacterSet();
    const rowProperty =
      characterSet.classifications[characterSet.arrangement.rowClassification]
        .property;
    const columnProperty =
      characterSet.classifications[
        characterSet.arrangement.columnClassification
      ].property;
    return characterSet.characters.find(
      character =>
        character[rowProperty] === rowValue &&
        character[columnProperty] === columnValue
    );
  }

  render() {
    return (
      <>
        {this.state.languages.map((language, langIdx) => (
          <div key={language.code}>
            {language.name}
            {language.data.characterSets.map(
              (characterSet, characterSetIdx) => (
                <div
                  key={characterSet.name}
                  onClick={() => this.setCharacterSet(langIdx, characterSetIdx)}
                >
                  {characterSet.name}
                </div>
              )
            )}
          </div>
        ))}
        {this.state.characterSet !== null && (
          <>
            {this.getCharacterSet().classifications[
              this.getCharacterSet().arrangement.rowClassification
            ].values.map(rowValue => (
              <div key={rowValue}>
                {this.getCharacterSet().classifications[
                  this.getCharacterSet().arrangement.columnClassification
                ].values.map(columnValue => {
                  const character = this.getCharacterAt(rowValue, columnValue);
                  return (
                    <span key={columnValue}>
                      {(character || {})[this.getDisplayProperty()] || (
                        <>&nbsp;</>
                      )}
                    </span>
                  );
                })}
              </div>
            ))}
          </>
        )}
        {this.state.characterSet !== null &&
          this.state.characterPosition === null && (
            <button onClick={this.startQuiz}>Start</button>
          )}
        {this.state.characterSet !== null &&
          this.state.characterPosition !== null && (
            <>
              <label htmlFor="response-input">
                {this.getCharacter()[this.getQueryProperty()]}
              </label>
              <input
                id="response-input"
                value={this.state.response}
                ref={this.responseInput}
                onInput={this.handleResponseInput}
              />
            </>
          )}
        {this.state.characterSet === null && (
          <div>Select characters to practice</div>
        )}
      </>
    );
  }
}

export default App;
