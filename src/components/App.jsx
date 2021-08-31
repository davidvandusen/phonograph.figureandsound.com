require('../styles/app.scss');

import {h, Component} from 'preact';
import {speak} from '../lib/speechSynthesis';
import {active} from '../lib/className';

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      data: {
        languages: null
      },
      ui: {
        loaded: false,
        language: null,
        characterSet: null,
        characterPosition: null,
        characterOrder: null,
        response: '',
        hasSpeech: false
      }
    };
  }

  loadLanguages() {
    if (!this.state.data.languages) {
      return fetch('data/languages/index.json')
        .then(res => res.json())
        .then(languages => this.setState({data: {...this.state.data, languages}}));
    } else {
      return Promise.resolve(this.state.data.languages);
    }
  }

  loadLanguage(lang) {
    const language = this.state.data.languages.find(l => l.lang === lang);
    if (language) {
      if (!language.data) {
        return fetch(language.href)
          .then(res => res.json())
          .then(data => {
            language.data = data;
            this.setState({
              data: {
                ...this.state.data,
                languages: this.state.data.languages
              }
            })
          });
      } else {
        return Promise.resolve(language.data);
      }
    } else {
      return Promise.reject(new Error(`language "${lang}" no found`));
    }
  }

  componentDidMount() {
    new Promise((resolve, reject) => speechSynthesis.addEventListener('voiceschanged', resolve))
      .then(() => {
        this.setState({
          ui: {
            ...this.state.ui,
            hasSpeech: true
          }
        });
      });
    this.loadLanguages()
      .then(() => {
        this.setState({
          ui: {
            ...this.state.ui,
            loaded: true
          }
        });
      })
      .catch(console.error.bind(console));
  }

  componentDidUpdate() {
    this.responseInput && this.responseInput.focus();
  }

  renderLoadingScreen() {
    return <div className="loading">Loading...</div>;
  }

  getLanguage() {
    return this.state.data.languages[this.state.ui.language];
  }

  setLanguage(idx) {
    const language = this.state.data.languages[idx];
    this.loadLanguage(language.lang).then(() => this.setState({
      ui: {
        ...this.state.ui,
        language: idx,
        characterSet: null,
        characterOrder: null,
        characterPosition: null
      }
    }));
  }

  getCharacterSets() {
    const language = this.getLanguage();
    return language.data.characterSets;
  }

  getCharacterSet() {
    const characterSets = this.getCharacterSets();
    return characterSets[this.state.ui.characterSet];
  }

  setCharacterSet(idx) {
    const characterSets = this.getCharacterSets();
    const characterSet = characterSets[idx];
    const characterOrder = Object.keys(characterSet.characters);
    this.setState({
      ui: {
        ...this.state.ui,
        characterSet: idx,
        characterOrder,
        characterPosition: null
      }
    });
  }

  defaultCharacterOrder() {
    return Object.keys(this.getCharacterSet().characters);
  }

  getCharacter(position) {
    const characters = this.getCharacterSet().characters;
    const characterPosition = position === undefined ? this.state.ui.characterPosition : position;
    const characterIndex = this.state.ui.characterOrder[characterPosition];
    return characters[characterIndex];
  }

  advanceCharacter(from) {
    const characters = this.getCharacterSet().characters;
    let characterPosition = from === undefined ? this.state.ui.characterPosition : from;
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
    return new Promise(resolve => this.setState({
      ui: {
        ...this.state.ui,
        characterPosition
      }
    }, resolve));
  }

  setCharacterOrder() {
    const characterOrder = this.defaultCharacterOrder();
    return new Promise(resolve => this.setState({
      ui: {
        ...this.state.ui,
        characterOrder
      }
    }, resolve));
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
      new Promise(resolve => setTimeout(resolve, 1000))
    ]).then(() => {
      this.setState({
        ui: {
          ...this.state.ui,
          response: ''
        }
      }, () => {
        this.advanceCharacter();
      });
    });
  }

  onResponseType() {
    this.setState({
      ui: {
        ...this.state.ui,
        response: this.responseInput.value
      }
    }, () => {
      const character = this.getCharacter();
      if (this.state.ui.response.toLowerCase() === character[this.getResponseProperty()].toLowerCase()) {
        this.moveToNextCharacter();
      }
    });
  }

  getCharacterAt(rowValue, columnValue) {
    const characterSet = this.getCharacterSet();
    const rowProperty = characterSet.classifications[characterSet.arrangement.rowClassification].property;
    const columnProperty = characterSet.classifications[characterSet.arrangement.columnClassification].property;
    return characterSet.characters.find(character => character[rowProperty] === rowValue && character[columnProperty] === columnValue);
  }

  isCurrentCharacter(character) {
    const character2 = this.getCharacter();
    const idProperty = this.getIdProperty();
    return !!character && !!character2 && character[idProperty] === character2[idProperty];
  }

  renderMainUI() {
    return (
      <div className="app">
        <div className="settings">
          <div className="languages">
            {this.state.data.languages.map((language, idx) => (
              <div
                key={language.lang}
                className={active(idx === this.state.ui.language, 'language')}
                onClick={() => this.setLanguage(idx)}>
                {language.name}
              </div>
            ))}
          </div>
          {this.state.ui.language !== null && (
            <div className="character-sets">
              {this.getCharacterSets().map((characterSet, idx) => (
                <div
                  key={characterSet.name}
                  className={active(idx === this.state.ui.characterSet, 'character-set')}
                  onClick={() => this.setCharacterSet(idx)}>
                  {characterSet.name}
                </div>
              ))}
            </div>
          )}
          {this.state.ui.characterSet !== null && (
            <div className="character-table responsive-table">
              <table>
                <tbody>
                {this.getCharacterSet().classifications[this.getCharacterSet().arrangement.rowClassification].values.map(rowValue => (
                  <tr key={rowValue}>
                    {this.getCharacterSet().classifications[this.getCharacterSet().arrangement.columnClassification].values.map(columnValue => {
                      const character = this.getCharacterAt(rowValue, columnValue);
                      return (
                        <td
                          key={columnValue}
                          className={active(this.isCurrentCharacter(character))}>
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
        <div className="content">
          {this.state.ui.characterSet !== null && this.state.ui.characterPosition === null && (
            <button onClick={() => this.startQuiz()}>Start</button>
          )}
          {this.state.ui.characterSet !== null && this.state.ui.characterPosition !== null && (
            <div className="present-character">
              <label
                className="display-character"
                key={this.getCharacter()[this.getIdProperty()]}
                htmlFor="response-input">
                {this.getCharacter()[this.getQueryProperty()]}
              </label>
              <div className="display-character-response">
                <input
                  id="response-input"
                  value={this.state.ui.response}
                  ref={el => this.responseInput = el}
                  onInput={() => this.onResponseType()} />
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
    return this.state.ui.loaded ? this.renderMainUI() : this.renderLoadingScreen();
  }
}

export default App;
