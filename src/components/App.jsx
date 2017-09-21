require('../styles/app.scss');

import React, {Component} from 'react';
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
      character: null,
      characterTransition: false,
      disabledClassifications: null
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

  renderLoadingScreen() {
    return <div>Loading...</div>;
  }

  getLanguage() {
    return this.state.language !== null ? this.state.languages[this.state.language] : null;
  }

  setLanguage(idx) {
    this.loadLanguage(this.state.languages[idx].lang).then(() => this.setState({
      language: idx,
      characterSet: null,
      disabledClasses: null,
      character: null
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
    this.setState({
      characterSet: idx,
      disabledClassifications,
      character: null
    });
  }

  getClassificationValues(property) {
    return this.getCharacterSet().characters.reduce((classificationValues, character) => {
      if (!classificationValues.includes(character[property])) classificationValues.push(character[property]);
      return classificationValues;
    }, []);
  }

  getCharacter() {
    const characters = this.getCharacterSet().characters;
    return characters[this.state.character];
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

  characterExcluded(idx) {
    const characters = this.getCharacterSet().characters;
    const character = characters[idx];
    for (const property in this.state.disabledClassifications) {
      const classification = this.state.disabledClassifications[property];
      if (classification.includes(character[property])) return true;
    }
    return false;
  }

  advanceCharacter() {
    const characters = this.getCharacterSet().characters;
    let character = this.state.character;
    if (character === null) character = 0;
    else character++;
    while (character < characters.length && this.characterExcluded(character)) character++;
    if (character === characters.length) character = null;
    return new Promise((resolve, reject) => {
      this.setState({
        character,
        characterTransition: false
      }, resolve);
    });
  }

  startQuiz() {
    this.advanceCharacter().then(() => {
      this.responseInput.focus();
    });
  }

  moveToNextCharacter() {
    const character = this.getCharacter();
    const language = this.getLanguage();
    speak(character.character, language.lang);
    setTimeout(() => {
      this.setState({characterTransition: true});
    }, 500);
    setTimeout(() => {
      this.responseInput.value = '';
      this.advanceCharacter();
    }, 750);
  }

  typeResponse() {
    const value = this.responseInput.value;
    const character = this.getCharacter();
    if (value.toLowerCase() === character.roman.toLowerCase()) {
      this.moveToNextCharacter();
    }
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
                        {classificationValue}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="content">
          {this.state.characterSet !== null && this.state.character === null && (
            <button onClick={() => this.startQuiz()}>Start</button>
          )}
          {this.state.characterSet !== null && this.state.character !== null && (
            <div className={active(this.state.characterTransition, 'display-character', 'dismiss')}>
              <label htmlFor="response-input">{this.getCharacter().character}</label>
              <div className="display-character-response">
                <input
                  ref={el => this.responseInput = el}
                  id="response-input"
                  onInput={() => this.typeResponse()}/>
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
