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
  const characterOrder = Object.keys(writingSystem.characters).map(Number);
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
  menuDetails = createRef();
  characterList = createRef();
  activeCharacter = createRef();

  constructor(props) {
    super(props);
    this.state = {
      ...getWritingSystemState(0, 0),
      transition: '',
      response: '',
    };
  }

  scrollActiveCharacterIntoView() {
    this.characterList.current.scrollLeft =
      this.activeCharacter.current.offsetLeft +
      this.activeCharacter.current.offsetWidth / 2 -
      this.characterList.current.offsetWidth / 2;
  }

  componentDidMount() {
    this.responseInput.current && this.responseInput.current.focus();
    this.scrollActiveCharacterIntoView();
    this.setState({ transition: 'in' });
  }

  componentDidUpdate() {
    this.menuDetails.current.open = false;
    this.scrollActiveCharacterIntoView();
  }

  setWritingSystem(languageIndex, writingSystemIndex) {
    this.setState(
      {
        ...getWritingSystemState(languageIndex, writingSystemIndex),
        transition: '',
      },
      () => {
        this.setState({ transition: 'in' });
      }
    );
  }

  getCharacterIndex() {
    return this.state.characterOrder[this.state.characterPosition];
  }

  getCharacter() {
    return this.state.writingSystem.characters[this.getCharacterIndex()];
  }

  advanceCharacter = () => {
    let { characterPosition } = this.state;
    if (characterPosition === this.state.writingSystem.characters.length - 1) {
      characterPosition = 0;
    } else {
      characterPosition += 1;
    }
    setTimeout(() => {
      this.setState({ characterPosition, response: '' }, () => {
        this.setState({ transition: 'in' });
      });
    }, 500);
  };

  speakCharacter() {
    const character = this.getCharacter();
    const spokenProperty = this.state.writingSystem.spokenProperty;
    return speak(character[spokenProperty], this.state.language.code);
  }

  proceedToNextCharacter() {
    this.setState({ transition: 'congratulate' });
    // Sometimes the utterance doesn't trigger its end event, so automatically
    // advance after a fixed amount of time if that happens, but ensure that a
    // minimum amount of time has elapsed before moving on.
    Promise.all([
      Promise.race([
        this.speakCharacter(),
        new Promise(resolve => setTimeout(resolve, 1000)),
      ]),
      new Promise(resolve => setTimeout(resolve, 1000)),
    ]).then(() => {
      this.setState({ transition: 'out' }, this.advanceCharacter);
    });
  }

  closeMenu = () => {
    this.menuDetails.current.open = false;
  };

  handleSummaryClickCapture = clickEvent => {
    if (this.menuDetails.current.open) {
      clickEvent.preventDefault();
      this.closeMenu();
    }
  };

  handleResponseInput = inputEvent => {
    this.setState({ response: inputEvent.target.value }, () => {
      const character = this.getCharacter();
      if (
        this.state.response.toLowerCase().trim() ===
        character[this.state.writingSystem.responseProperty].toLowerCase()
      ) {
        this.proceedToNextCharacter();
      }
    });
  };

  render() {
    return (
      <div
        className={`app-layout transition-${this.state.transition}`}
        onClick={this.closeMenu}
      >
        <details ref={this.menuDetails} className="writing-system-selector">
          <summary onClickCapture={this.handleSummaryClickCapture}>
            {this.state.language.name} {this.state.writingSystem.name}
          </summary>
          <menu>
            {languages.map((language, languageIndex) =>
              language.data.writingSystems.map(
                (writingSystem, writingSystemIndex) => {
                  const isCurrent =
                    this.state.language === language &&
                    this.state.writingSystem === writingSystem;
                  return (
                    <li key={`${language.name}:${writingSystem.name}`}>
                      <button
                        className={isCurrent ? 'current' : ''}
                        onClick={() =>
                          this.setWritingSystem(
                            languageIndex,
                            writingSystemIndex
                          )
                        }
                      >
                        {language.name} {writingSystem.name}
                      </button>
                    </li>
                  );
                }
              )
            )}
          </menu>
        </details>
        <ol ref={this.characterList} className="character-list">
          {this.state.writingSystem.characters.map(
            (character, characterIndex) => {
              const isActiveCharacter =
                characterIndex === this.getCharacterIndex();
              return (
                <li
                  key={character[this.state.writingSystem.idProperty]}
                  ref={isActiveCharacter && this.activeCharacter}
                  className={isActiveCharacter ? 'active' : ''}
                >
                  {character[this.state.writingSystem.displayProperty]}
                </li>
              );
            }
          )}
        </ol>
        <div className="character-query">
          <label htmlFor="response-input">
            {this.getCharacter()[this.state.writingSystem.queryProperty]}
          </label>
          <div className="response-prompt">
            <input
              ref={this.responseInput}
              autoCapitalize={false}
              autoComplete={false}
              autoCorrect={false}
              autoFocus={true}
              id="response-input"
              onFocus={this.closeMenu}
              onInput={this.handleResponseInput}
              placeholder={
                this.getCharacter()[this.state.writingSystem.responseProperty]
              }
              spellCheck={false}
              value={this.state.response}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default App;
