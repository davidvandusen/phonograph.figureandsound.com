import '../styles/app.css';

// noinspection ES6UnusedImports
import { Component, createRef, h } from 'preact';
import { speak } from '../lib/speechSynthesis';
import shuffle from '../lib/shuffle';
import languages from '../data/languages/index.json';
import elGR from '../data/languages/el-GR.json';
import jaJP from '../data/languages/ja-JP.json';
import ruRU from '../data/languages/ru-RU.json';
import zhCN from '../data/languages/zh-CN.json';

const languageData = {
  'el-GR': elGR,
  'ja-JP': jaJP,
  'ru-RU': ruRU,
  'zh-CN': zhCN,
};

languages.forEach(language => {
  language.data = languageData[language.code];
});

let scores;

try {
  const rawScores = localStorage.getItem('scores');
  scores = JSON.parse(rawScores);
} catch (e) {
  // Can't access storage or bad JSON
  scores = {};
}

if (typeof scores !== 'object' || scores === null) {
  scores = {};
}

const saveScores = () => {
  try {
    localStorage.setItem('scores', JSON.stringify(scores));
  } catch (e) {
    // Can't access storage
  }
};

const updateScore = (language, writingSystem, character, isCharacterFailed) => {
  const scoreKey = `${language.code}:${writingSystem.name}`;
  const scoresForWritingSystem = scores[scoreKey];
  const currentScore =
    scoresForWritingSystem[character[writingSystem.idProperty]];
  const scoreIncrement = isCharacterFailed ? 1 : -1;
  scoresForWritingSystem[character[writingSystem.idProperty]] = Math.max(
    0,
    currentScore + scoreIncrement
  );
  saveScores();
};

const getWritingSystemState = (languageIndex, writingSystemIndex) => {
  const language = languages[languageIndex];
  const writingSystem = language.data.writingSystems[writingSystemIndex];
  let characterOrder;
  const scoreKey = `${language.code}:${writingSystem.name}`;
  const scoresForWritingSystem = scores[scoreKey];
  if (!scoresForWritingSystem) {
    scores[scoreKey] = writingSystem.characters.reduce(
      (scoreObject, character) => {
        scoreObject[character[writingSystem.idProperty]] = 0;
        return scoreObject;
      },
      {}
    );
    saveScores();
  }
  characterOrder = Object.keys(writingSystem.characters).map(Number);
  const characterPosition = 0;
  const isCharacterFailed = false;
  return {
    characterOrder,
    characterPosition,
    isCharacterFailed,
    language,
    writingSystem,
  };
};

const getScoredCharacterOrder = (language, writingSystem) => {
  const characterOrder = Object.keys(writingSystem.characters).map(Number);
  const scoreKey = `${language.code}:${writingSystem.name}`;
  const scoresForWritingSystem = scores[scoreKey];
  writingSystem.characters.forEach((character, characterIndex) => {
    const scoreForCharacter =
      scoresForWritingSystem[character[writingSystem.idProperty]];
    for (let i = scoreForCharacter; i > 0; i--) {
      characterOrder.push(characterIndex);
    }
  });
  return shuffle(characterOrder);
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
    clearTimeout(this.failureTimer);
    this.setState(
      {
        ...getWritingSystemState(languageIndex, writingSystemIndex),
        transition: '',
        response: '',
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
    let { characterOrder, characterPosition } = this.state;
    if (characterPosition === characterOrder.length - 1) {
      characterOrder = getScoredCharacterOrder(
        this.state.language,
        this.state.writingSystem
      );
      characterPosition = 0;
    } else {
      characterPosition += 1;
    }
    setTimeout(() => {
      this.setState({ characterPosition, characterOrder, response: '' }, () => {
        clearTimeout(this.failureTimer);
        this.failureTimer = setTimeout(() => {
          this.setState({ isCharacterFailed: true });
        }, 15000);
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
    updateScore(
      this.state.language,
      this.state.writingSystem,
      this.getCharacter(),
      this.state.isCharacterFailed
    );
    this.setState({ isCharacterFailed: false, transition: 'congratulate' });
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
    const isCharacterFailed = inputEvent.inputType.startsWith('delete')
      ? true
      : this.state.isCharacterFailed;
    this.setState(
      {
        isCharacterFailed,
        response: inputEvent.target.value,
      },
      () => {
        const character = this.getCharacter();
        const normalizedResponse = this.state.response.trim().normalize('NFC');
        const isCorrectLatin =
          character[this.state.writingSystem.latinResponseProperty] ===
          normalizedResponse.toLocaleLowerCase('en');
        const isCorrectLocale =
          character[this.state.writingSystem.localeResponseProperty] ===
          normalizedResponse;
        if (isCorrectLatin || isCorrectLocale) {
          this.proceedToNextCharacter();
        }
      }
    );
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
              autoCapitalize="false"
              autoComplete="false"
              autoCorrect="false"
              autoFocus="true"
              id="response-input"
              onFocus={this.closeMenu}
              onInput={this.handleResponseInput}
              placeholder={
                this.getCharacter()[
                  this.state.writingSystem.latinResponseProperty
                ]
              }
              spellCheck="false"
              value={this.state.response}
            />
          </div>
        </div>
        <div className="legal"><p><small>© 2021 David VanDusen</small></p></div>
      </div>
    );
  }
}

export default App;
