require('../styles/app.css');

import { h, Component } from 'preact';
import { speak } from '../lib/speechSynthesis';
import languages from '../data/languages/index.json';
import greek from '../data/languages/el-GR.json';
import japanese from '../data/languages/ja-JP.json';

const languageData = [greek, japanese];

languages.forEach(language => {
  language.data = languageData.find(data => data.lang === language.lang);
});

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: {
        languages,
      },
      ui: {
        language: null,
        characterSet: null,
        characterPosition: null,
        characterOrder: null,
        response: '',
        hasSpeech: false,
      },
    };
  }

  componentDidMount() {
    new Promise(resolve =>
      speechSynthesis.addEventListener('voiceschanged', resolve)
    ).then(() => {
      this.setState({
        ui: {
          ...this.state.ui,
          hasSpeech: true,
        },
      });
    });
  }

  componentDidUpdate() {
    this.responseInput && this.responseInput.focus();
  }

  getLanguage() {
    return this.state.data.languages[this.state.ui.language];
  }

  getCharacterSets() {
    const language = this.getLanguage();
    return language.data.characterSets;
  }

  getCharacterSet() {
    const characterSets = this.getCharacterSets();
    return characterSets[this.state.ui.characterSet];
  }

  setCharacterSet(langIdx, characterSetIdx) {
    this.setState(
      {
        ui: {
          ...this.state.ui,
          language: langIdx,
        },
      },
      () => {
        const characterSets = this.getCharacterSets();
        const characterSet = characterSets[characterSetIdx];
        const characterOrder = Object.keys(characterSet.characters);
        this.setState({
          ui: {
            ...this.state.ui,
            characterSet: characterSetIdx,
            characterOrder,
            characterPosition: null,
          },
        });
      }
    );
  }

  defaultCharacterOrder() {
    return Object.keys(this.getCharacterSet().characters);
  }

  getCharacter(position) {
    const characters = this.getCharacterSet().characters;
    const characterPosition =
      position === undefined ? this.state.ui.characterPosition : position;
    const characterIndex = this.state.ui.characterOrder[characterPosition];
    return characters[characterIndex];
  }

  advanceCharacter(from) {
    const characters = this.getCharacterSet().characters;
    let characterPosition =
      from === undefined ? this.state.ui.characterPosition : from;
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
      this.setState(
        {
          ui: {
            ...this.state.ui,
            characterPosition,
          },
        },
        resolve
      )
    );
  }

  setCharacterOrder() {
    const characterOrder = this.defaultCharacterOrder();
    return new Promise(resolve =>
      this.setState(
        {
          ui: {
            ...this.state.ui,
            characterOrder,
          },
        },
        resolve
      )
    );
  }

  startQuiz() {
    this.setCharacterOrder().then(() => this.advanceCharacter(null));
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
    if (this.state.ui.characterPosition === null) return Promise.resolve();
    const character = this.getCharacter();
    const language = this.getLanguage();
    const property = this.getSpokenProperty();
    return speak(character[property], language.lang);
  }

  moveToNextCharacter() {
    // Sometimes the utterance doesn't trigger its end event, so
    // automatically advance after a fixed amount of time if that happens
    Promise.race([
      this.speakCharacter(),
      new Promise(resolve => setTimeout(resolve, 1000)),
    ]).then(() => {
      this.setState(
        {
          ui: {
            ...this.state.ui,
            response: '',
          },
        },
        () => {
          this.advanceCharacter();
        }
      );
    });
  }

  onResponseType() {
    this.setState(
      {
        ui: {
          ...this.state.ui,
          response: this.responseInput.value,
        },
      },
      () => {
        const character = this.getCharacter();
        if (
          this.state.ui.response.toLowerCase() ===
          character[this.getResponseProperty()].toLowerCase()
        ) {
          this.moveToNextCharacter();
        }
      }
    );
  }

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

  isCurrentCharacter(character) {
    const character2 = this.getCharacter();
    const idProperty = this.getIdProperty();
    return (
      !!character &&
      !!character2 &&
      character[idProperty] === character2[idProperty]
    );
  }

  renderMainUI() {
    return (
      <div>
        <div>
          <div>
            {this.state.data.languages.map((language, langIdx) => (
              <div key={language.lang}>
                {language.name}
                <div>
                  {language.data.characterSets.map(
                    (characterSet, characterSetIdx) => (
                      <div
                        key={characterSet.name}
                        onClick={() =>
                          this.setCharacterSet(langIdx, characterSetIdx)
                        }
                      >
                        {characterSet.name}
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
          {this.state.ui.characterSet !== null && (
            <div>
              <table>
                <tbody>
                  {this.getCharacterSet().classifications[
                    this.getCharacterSet().arrangement.rowClassification
                  ].values.map(rowValue => (
                    <tr key={rowValue}>
                      {this.getCharacterSet().classifications[
                        this.getCharacterSet().arrangement.columnClassification
                      ].values.map(columnValue => {
                        const character = this.getCharacterAt(
                          rowValue,
                          columnValue
                        );
                        return (
                          <td key={columnValue}>
                            {(character || {})[this.getDisplayProperty()]}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          {this.state.ui.characterSet !== null &&
            this.state.ui.characterPosition === null && (
              <button onClick={() => this.startQuiz()}>Start</button>
            )}
          {this.state.ui.characterSet !== null &&
            this.state.ui.characterPosition !== null && (
              <div>
                <label
                  key={this.getCharacter()[this.getIdProperty()]}
                  htmlFor="response-input"
                >
                  {this.getCharacter()[this.getQueryProperty()]}
                </label>
                <div>
                  <input
                    id="response-input"
                    value={this.state.ui.response}
                    ref={el => (this.responseInput = el)}
                    onInput={() => this.onResponseType()}
                  />
                </div>
              </div>
            )}
          {this.state.ui.characterSet === null && (
            <div>Select characters to practice...</div>
          )}
        </div>
      </div>
    );
  }

  render() {
    return this.renderMainUI();
  }
}

export default App;
