require('../styles/app.scss');

import React, {Component} from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import {speak} from '../lib/speechSynthesis';
import {active, disabled} from '../lib/className';

class App extends Component {

  constructor(props) {
    super(props);
    this.state = props;
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

  renderLoadingScreen() {
    return <div>Loading...</div>;
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
    const disabledClassifications = {};
    characterSet.classifications.forEach(classification => disabledClassifications[classification.property] = []);
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

  getClassificationValues(property) {
    return this.getCharacterSet().characters.reduce((classificationValues, character) => {
      if (!classificationValues.includes(character[property])) classificationValues.push(character[property]);
      return classificationValues;
    }, []);
  }

  getCharacter(position) {
    const characters = this.getCharacterSet().characters;
    const characterPosition = position === undefined ? this.state.characterPosition : position;
    const characterIndex = this.state.characterOrder[characterPosition];
    return characters[characterIndex];
  }

  toggleClassification(property, value) {
    const disabledClassifications = this.state.disabledClassifications;
    const classification = disabledClassifications[property];
    const idx = classification.indexOf(value);
    if (idx === -1) classification.push(value);
    else classification.splice(idx, 1);
    this.setState({disabledClassifications});
  }

  toggleClassificationAll(property) {
    const values = this.getClassificationValues(property);
    values.forEach(value => this.toggleClassification(property, value));
  }

  characterExcluded(position) {
    const character = this.getCharacter(position);
    for (const property in this.state.disabledClassifications) {
      const classification = this.state.disabledClassifications[property];
      if (classification.includes(character[property])) return true;
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
    return new Promise((resolve, reject) => {
      this.setState({characterPosition: characterPosition}, () => {
        resolve();
      });
    });
  }

  setCharacterOrder() {
    const characterOrder = this.state.shuffle ? this.shuffledCharacters() : this.defaultCharacterOrder();
    return new Promise((resolve, reject) => {
      this.setState({characterOrder}, resolve);
    });
  }

  startQuiz() {
    this.setCharacterOrder().then(() => {
      this.advanceCharacter(null);
    });
  }

  speakCharacter() {
    const character = this.getCharacter();
    const language = this.getLanguage();
    return speak(character.character, language.lang);
  }

  moveToNextCharacter() {
    this.speakCharacter().then(() => {
      this.setState({response: ''}, () => {
        this.advanceCharacter();
      });
    });
  }

  onResponseType() {
    this.setState({response: this.responseInput.value}, () => {
      const character = this.getCharacter();
      if (this.state.response.toLowerCase() === character.roman.toLowerCase()) {
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
                      onClick={() => this.toggleClassificationAll(classification.property)}>toggle all</span>
                  </div>
                  <div className="character-classification-values">
                    {this.getClassificationValues(classification.property).map((classificationValue) => (
                      <div
                        key={classificationValue}
                        className={disabled(this.state.disabledClassifications[classification.property].includes(classificationValue), 'character-classification-value')}
                        onClick={() => this.toggleClassification(classification.property, classificationValue)}>
                        {classificationValue.toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
                  key={this.getCharacter().character}
                  htmlFor="response-input"
                  onClick={() => this.speakCharacter()}>
                  {this.getCharacter().character}
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
