require('../styles/app.scss');

import React, {Component} from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import {speak} from '../lib/speechSynthesis';
import {active, disabled} from '../lib/className';

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loaded: false,
      languages: null,
      language: null,
      characterSet: null,
      characterPosition: null,
      characterOrder: null,
      disabledClassifications: null,
      shuffle: false,
      repeat: false,
      response: ''
    };
  }

  loadLanguages() {
    if (!this.state.languages) {
      return fetch('/data/languages/index.json')
        .then(res => res.json())
        .then(languages => this.setState({languages}));
    } else {
      return Promise.resolve(this.state.languages);
    }
  }

  loadLanguage(lang) {
    const language = this.state.languages.find(l => l.lang === lang);
    if (language) {
      if (!language.data) {
        return fetch(language.href)
          .then(res => res.json())
          .then(data => {
            language.data = data;
            this.setState({languages: this.state.languages})
          });
      } else {
        return Promise.resolve(language.data);
      }
    } else {
      return Promise.reject(new Error(`language "${lang}" no found`));
    }
  }

  componentDidMount() {
    Promise
      .all([
        this.loadLanguages(),
        new Promise((resolve, reject) => speechSynthesis.addEventListener('voiceschanged', resolve))
      ])
      .then(() => {
        this.setState({loaded: true});
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
    return this.state.languages[this.state.language];
  }

  setLanguage(idx) {
    const language = this.state.languages[idx];
    this.loadLanguage(language.lang).then(() => this.setState({
      language: idx,
      characterSet: null,
      disabledClassifications: null,
      characterOrder: null,
      characterPosition: null
    }));
  }

  getCharacterSets() {
    const language = this.getLanguage();
    return language.data.characterSets;
  }

  getCharacterSet() {
    const characterSets = this.getCharacterSets();
    return characterSets[this.state.characterSet];
  }

  setCharacterSet(idx) {
    const characterSets = this.getCharacterSets();
    const characterSet = characterSets[idx];
    const disabledClassifications = [];
    characterSet.classifications.forEach((classification, idx) => disabledClassifications[idx] = []);
    const characterOrder = Object.keys(characterSet.characters);
    this.setState({
      characterSet: idx,
      disabledClassifications,
      characterOrder,
      characterPosition: null
    });
  }

  defaultCharacterOrder() {
    return Object.keys(this.getCharacterSet().characters);
  }

  shuffledCharacters() {
    const characterOrder = [];
    const defaultOrder = this.defaultCharacterOrder();
    while (defaultOrder.length) {
      const i = Math.floor(Math.random() * defaultOrder.length);
      characterOrder.push(defaultOrder[i]);
      defaultOrder.splice(i, 1);
    }
    return characterOrder;
  }

  getCharacter(position) {
    const characters = this.getCharacterSet().characters;
    const characterPosition = position === undefined ? this.state.characterPosition : position;
    const characterIndex = this.state.characterOrder[characterPosition];
    return characters[characterIndex];
  }

  toggleClassification(classIdx, value) {
    const disabledClassifications = this.state.disabledClassifications;
    const classification = disabledClassifications[classIdx];
    const idx = classification.indexOf(value);
    if (idx === -1) classification.push(value);
    else classification.splice(idx, 1);
    this.setState({disabledClassifications});
  }

  toggleClassificationAll(idx) {
    const values = this.getCharacterSet().classifications[idx].values;
    values.forEach(value => this.toggleClassification(idx, value));
  }

  characterExcluded(position) {
    const classifications = this.getCharacterSet().classifications;
    const character = this.getCharacter(position);
    for (const idx in this.state.disabledClassifications) {
      const disabledValues = this.state.disabledClassifications[idx];
      const property = classifications[idx].property;
      const value = character[property];
      if (disabledValues.includes(value)) return true;
    }
    return false;
  }

  advanceCharacter(from, by = 1) {
    const characters = this.getCharacterSet().characters;
    let characterPosition = from === undefined ? this.state.characterPosition : from;
    let fromBeginning = false;
    if (characterPosition === null) {
      fromBeginning = true;
      characterPosition = 0;
    } else {
      characterPosition += by;
    }
    if (characterPosition < 0) {
      return Promise.resolve();
    }
    while (characterPosition < characters.length && this.characterExcluded(characterPosition)) {
      characterPosition += by;
    }
    if (characterPosition === characters.length) {
      if (fromBeginning) {
        return Promise.reject('All characters have been excluded. Enable some character sets.');
      }
      characterPosition = null;
      if (this.state.repeat) {
        this.startQuiz();
        return Promise.resolve();
      }
    }
    return new Promise(resolve => this.setState({characterPosition: characterPosition}, resolve));
  }

  setCharacterOrder() {
    const characterOrder = this.state.shuffle ? this.shuffledCharacters() : this.defaultCharacterOrder();
    return new Promise(resolve => this.setState({characterOrder}, resolve));
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
    if (this.state.characterPosition === null) return Promise.resolve();
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
      this.setState({response: ''}, () => {
        this.advanceCharacter();
      });
    });
  }

  onResponseType() {
    this.setState({response: this.responseInput.value}, () => {
      const character = this.getCharacter();
      if (this.state.response.toLowerCase() === character[this.getResponseProperty()].toLowerCase()) {
        this.moveToNextCharacter();
      }
    });
  }

  toggleRepeat() {
    this.setState({repeat: !this.state.repeat});
  }

  toggleShuffle() {
    this.setState({shuffle: !this.state.shuffle}, () => {
      if (this.state.characterPosition !== null) this.setCharacterOrder();
    });
  }

  canGoBack() {
    return this.state.characterPosition !== null && this.state.characterPosition !== 0;
  }

  canGoForward() {
    return this.state.characterPosition !== null;
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
            {this.state.languages.map((language, idx) => (
              <div
                key={language.lang}
                className={active(idx === this.state.language, 'language')}
                onClick={() => this.setLanguage(idx)}>
                {language.name}
              </div>
            ))}
          </div>
          {this.state.language !== null && (
            <div className="character-sets">
              {this.getCharacterSets().map((characterSet, idx) => (
                <div
                  key={characterSet.name}
                  className={active(idx === this.state.characterSet, 'character-set')}
                  onClick={() => this.setCharacterSet(idx)}>
                  {characterSet.name}
                </div>
              ))}
            </div>
          )}
          {this.state.characterSet !== null && (
            <div className="character-classifications">
              {this.getCharacterSet().classifications.map((classification, idx) => (
                <div
                  key={classification.name}
                  className="character-classification">
                  <div className="character-classification-name">
                    {classification.name}
                    <span
                      className="group-action"
                      onClick={() => this.toggleClassificationAll(idx)}>toggle all</span>
                  </div>
                  <div className="character-classification-values">
                    {classification.values.map((classificationValue) => (
                      <div
                        key={classificationValue}
                        className={disabled(this.state.disabledClassifications[idx].includes(classificationValue), 'character-classification-value')}
                        onClick={() => this.toggleClassification(idx, classificationValue)}>
                        {classificationValue.toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {this.state.characterSet !== null && (
            <div className="character-table">
              <div className="responsive-table">
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
            </div>
          )}
        </div>
        <div className="content">
          {this.state.characterSet !== null && this.state.characterPosition === null && (
            <button onClick={() => this.startQuiz()}>Start</button>
          )}
          {this.state.characterSet !== null && this.state.characterPosition !== null && (
            <div className="present-character">
              <ReactCSSTransitionGroup
                transitionName="display-character"
                transitionEnterTimeout={555}
                transitionLeaveTimeout={255}>
                <label
                  className="display-character"
                  key={this.getCharacter()[this.getIdProperty()]}
                  htmlFor="response-input">
                  {this.getCharacter()[this.getQueryProperty()]}
                </label>
              </ReactCSSTransitionGroup>
              <div className="display-character-response">
                <input
                  id="response-input"
                  value={this.state.response}
                  ref={el => this.responseInput = el}
                  onChange={() => this.onResponseType()} />
              </div>
            </div>
          )}
          {this.state.characterSet !== null && (
            <div className="player-controls">
              <div
                title="Repeat"
                className={disabled(!this.state.repeat, 'player-control')}
                onClick={() => this.toggleRepeat()}>
                R
              </div>
              <div
                title="Shuffle"
                className={disabled(!this.state.shuffle, 'player-control')}
                onClick={() => this.toggleShuffle()}>
                S
              </div>
              <div
                title="Previous Character"
                className={disabled(!this.canGoBack(), 'player-control')}
                onClick={() => {
                  if (this.canGoBack()) this.advanceCharacter(undefined, -1);
                }}>
                ◄
              </div>
              <div
                title="Next Character"
                className={disabled(!this.canGoForward(), 'player-control')}
                onClick={() => {
                  if (this.canGoForward()) this.moveToNextCharacter();
                }}>
                ►
              </div>
            </div>
          )}
          {this.state.characterSet === null && (
            <div>Select characters to practice...</div>
          )}
        </div>
      </div>
    );
  }

  render() {
    return this.state.loaded ? this.renderMainUI() : this.renderLoadingScreen();
  }
}

export default App;
