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

const getWritingSystemState = (languageIndex, writingSystemIndex) => {
  const language = languages[languageIndex];
  const writingSystem = language.data.writingSystems[writingSystemIndex];
  const characterOrder = Object.keys(writingSystem.characters);
  const characterPosition = 0;
  return {
    characterOrder,
    characterPosition,
    writingSystem,
    language,
  };
};

class App extends Component {
  responseInput = createRef();

  constructor(props) {
    super(props);
    this.state = {
      ...getWritingSystemState(0, 0),
      response: '',
    };
  }

  componentDidUpdate() {
    this.responseInput.current && this.responseInput.current.focus();
  }

  setWritingSystem(languageIndex, writingSystemIndex) {
    this.setState(getWritingSystemState(languageIndex, writingSystemIndex));
  }

  getCharacter() {
    const characterIndex =
      this.state.characterOrder[this.state.characterPosition];
    return this.state.writingSystem.characters[characterIndex];
  }

  advanceCharacter = () => {
    let { characterPosition } = this.state;
    if (characterPosition === this.state.writingSystem.characters.length - 1) {
      characterPosition = 0;
    } else {
      characterPosition += 1;
    }
    this.setState({ characterPosition });
  };

  speakCharacter() {
    const character = this.getCharacter();
    const spokenProperty = this.state.writingSystem.spokenProperty;
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
        character[this.state.writingSystem.responseProperty].toLowerCase()
      ) {
        this.proceedToNextCharacter();
      }
    });
  };

  render() {
    return (
      <div>
        <div>
          <div>
            {this.state.language.name} {this.state.writingSystem.name}
          </div>
          <div>
            {languages.map((language, languageIndex) =>
              language.data.writingSystems.map(
                (writingSystem, writingSystemIndex) => (
                  <div
                    key={`${language.name}:${writingSystem.name}`}
                    onClick={() =>
                      this.setWritingSystem(languageIndex, writingSystemIndex)
                    }
                  >
                    {language.name} {writingSystem.name}
                  </div>
                )
              )
            )}
          </div>
        </div>
        <div>
          {this.state.writingSystem.characters.map(character => (
            <span key={character[this.state.writingSystem.idProperty]}>
              {character[this.state.writingSystem.displayProperty]}
            </span>
          ))}
        </div>
        <div>
          <label htmlFor="response-input">
            {this.getCharacter()[this.state.writingSystem.queryProperty]}
          </label>{' '}
          <input
            ref={this.responseInput}
            id="response-input"
            onInput={this.handleResponseInput}
            value={this.state.response}
          />
        </div>
      </div>
    );
  }
}

export default App;
