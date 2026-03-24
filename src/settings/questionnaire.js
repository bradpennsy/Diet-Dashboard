const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extra: 1.9,
};

const MACRO_SPLITS = {
  balanced: { protein: 0.30, carbs: 0.40, fat: 0.30 },
  'high-protein': { protein: 0.40, carbs: 0.30, fat: 0.30 },
  'low-carb': { protein: 0.30, carbs: 0.20, fat: 0.50 },
  keto: { protein: 0.25, carbs: 0.05, fat: 0.70 },
};

function calculateTargets(answers) {
  // Convert units to metric
  const weightKg = answers.weightUnit === 'lbs'
    ? answers.weight * 0.453592
    : answers.weight;
  const heightCm = answers.heightUnit === 'ftin'
    ? (answers.heightFt * 30.48) + (answers.heightIn * 2.54)
    : answers.heightCm;

  // BMR (Mifflin-St Jeor)
  const bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * answers.age)
    + (answers.sex === 'male' ? 5 : -161);

  // TDEE
  const tdee = bmr * ACTIVITY_MULTIPLIERS[answers.activity];

  // Calorie target
  const calorieAdjust = { lose: -500, maintain: 0, gain: 300 };
  const calories = Math.round(tdee + calorieAdjust[answers.goal]);

  // Macro split
  const split = MACRO_SPLITS[answers.preference];
  const protein = Math.round((calories * split.protein) / 4);
  const carbs = Math.round((calories * split.carbs) / 4);
  const fat = Math.round((calories * split.fat) / 9);

  return {
    calories,
    protein,
    carbs,
    fat,
    fiber: 30,
    sugar: 50,
    sodium: 2300,
  };
}

export function renderQuestionnaire(container, onComplete) {
  const state = {
    currentStep: 0,
    answers: {
      sex: null,
      age: null,
      heightUnit: 'ftin',
      heightFt: null,
      heightIn: null,
      heightCm: null,
      weightUnit: 'lbs',
      weight: null,
      activity: null,
      goal: null,
      preference: null,
    },
  };

  const steps = [
    createSexStep(),
    createAgeStep(),
    createHeightStep(),
    createWeightStep(),
    createActivityStep(),
    createGoalStep(),
    createPreferenceStep(),
    createSummaryStep(),
  ];

  function renderStep() {
    container.innerHTML = '';
    const step = steps[state.currentStep];
    const cardDiv = document.createElement('div');
    cardDiv.className = 'setup-card questionnaire-step';

    const content = step.render(state.answers);
    cardDiv.innerHTML = content;

    // Attach event listeners
    if (step.attachListeners) {
      step.attachListeners(cardDiv, state.answers);
    }

    // Navigation
    const nav = document.createElement('div');
    nav.className = 'setup-nav';

    const backBtn = document.createElement('button');
    backBtn.className = 'setup-nav-back';
    backBtn.textContent = 'Back';
    backBtn.style.display = state.currentStep === 0 ? 'none' : 'block';
    backBtn.addEventListener('click', () => {
      state.currentStep--;
      renderStep();
    });

    const nextBtn = document.createElement('button');
    nextBtn.className = 'setup-nav-next';
    nextBtn.textContent = state.currentStep === steps.length - 1 ? 'Confirm' : 'Next';
    nextBtn.addEventListener('click', () => {
      if (!step.validate(state.answers)) {
        alert('Please fill in all fields');
        return;
      }
      if (state.currentStep === steps.length - 1) {
        onComplete(state.answers.targets);
      } else {
        state.currentStep++;
        renderStep();
      }
    });

    nav.appendChild(backBtn);
    nav.appendChild(nextBtn);
    cardDiv.appendChild(nav);
    container.appendChild(cardDiv);
  }

  function createSexStep() {
    return {
      render: (answers) => `
        <h2>What's your biological sex?</h2>
        <div class="setup-button-group">
          <button class="setup-button ${answers.sex === 'male' ? 'selected' : ''}" data-sex="male">Male</button>
          <button class="setup-button ${answers.sex === 'female' ? 'selected' : ''}" data-sex="female">Female</button>
        </div>
      `,
      attachListeners: (card, answers) => {
        card.querySelectorAll('[data-sex]').forEach(btn => {
          btn.addEventListener('click', () => {
            answers.sex = btn.dataset.sex;
            renderStep();
          });
        });
      },
      validate: (answers) => answers.sex !== null,
    };
  }

  function createAgeStep() {
    return {
      render: (answers) => `
        <h2>What's your age?</h2>
        <div class="number-input-group">
          <input type="number" class="age-input" min="15" max="120" placeholder="Age" value="${answers.age || ''}" />
        </div>
      `,
      attachListeners: (card, answers) => {
        const input = card.querySelector('.age-input');
        input.addEventListener('change', () => {
          answers.age = parseInt(input.value, 10);
        });
        input.focus();
      },
      validate: (answers) => answers.age !== null && answers.age > 0,
    };
  }

  function createHeightStep() {
    return {
      render: (answers) => {
        if (answers.heightUnit === 'ftin') {
          return `
            <h2>What's your height?</h2>
            <div class="unit-toggle-group">
              <button class="unit-toggle active" data-unit="ftin">Feet/Inches</button>
              <button class="unit-toggle" data-unit="cm">Centimeters</button>
            </div>
            <div class="height-input-row">
              <div>
                <input type="number" class="height-ft" min="0" max="8" placeholder="Feet" value="${answers.heightFt || ''}" />
                <div class="height-unit-label">ft</div>
              </div>
              <div>
                <input type="number" class="height-in" min="0" max="11" placeholder="Inches" value="${answers.heightIn || ''}" />
                <div class="height-unit-label">in</div>
              </div>
            </div>
          `;
        } else {
          return `
            <h2>What's your height?</h2>
            <div class="unit-toggle-group">
              <button class="unit-toggle" data-unit="ftin">Feet/Inches</button>
              <button class="unit-toggle active" data-unit="cm">Centimeters</button>
            </div>
            <div class="number-input-group">
              <input type="number" class="height-cm" min="100" max="250" placeholder="Height (cm)" value="${answers.heightCm || ''}" />
            </div>
          `;
        }
      },
      attachListeners: (card, answers) => {
        card.querySelectorAll('[data-unit]').forEach(btn => {
          btn.addEventListener('click', () => {
            answers.heightUnit = btn.dataset.unit;
            renderStep();
          });
        });
        const ftInput = card.querySelector('.height-ft');
        const inInput = card.querySelector('.height-in');
        const cmInput = card.querySelector('.height-cm');

        if (ftInput) {
          ftInput.addEventListener('change', () => {
            answers.heightFt = parseInt(ftInput.value, 10);
          });
          inInput.addEventListener('change', () => {
            answers.heightIn = parseInt(inInput.value, 10);
          });
          ftInput.focus();
        } else if (cmInput) {
          cmInput.addEventListener('change', () => {
            answers.heightCm = parseInt(cmInput.value, 10);
          });
          cmInput.focus();
        }
      },
      validate: (answers) => {
        if (answers.heightUnit === 'ftin') {
          return answers.heightFt !== null && answers.heightIn !== null;
        } else {
          return answers.heightCm !== null;
        }
      },
    };
  }

  function createWeightStep() {
    return {
      render: (answers) => `
        <h2>What's your current weight?</h2>
        <div class="unit-toggle-group">
          <button class="unit-toggle ${answers.weightUnit === 'lbs' ? 'active' : ''}" data-unit="lbs">Pounds</button>
          <button class="unit-toggle ${answers.weightUnit === 'kg' ? 'active' : ''}" data-unit="kg">Kilograms</button>
        </div>
        <div class="number-input-group">
          <input type="number" class="weight-input" min="30" max="500" placeholder="Weight" value="${answers.weight || ''}" />
        </div>
      `,
      attachListeners: (card, answers) => {
        card.querySelectorAll('[data-unit]').forEach(btn => {
          btn.addEventListener('click', () => {
            answers.weightUnit = btn.dataset.unit;
            renderStep();
          });
        });
        const input = card.querySelector('.weight-input');
        input.addEventListener('change', () => {
          answers.weight = parseFloat(input.value);
        });
        input.focus();
      },
      validate: (answers) => answers.weight !== null && answers.weight > 0,
    };
  }

  function createActivityStep() {
    return {
      render: (answers) => `
        <h2>What's your activity level?</h2>
        <div class="setup-button-group">
          <button class="setup-button ${answers.activity === 'sedentary' ? 'selected' : ''}" data-activity="sedentary">Sedentary</button>
          <button class="setup-button ${answers.activity === 'light' ? 'selected' : ''}" data-activity="light">Lightly active</button>
          <button class="setup-button ${answers.activity === 'moderate' ? 'selected' : ''}" data-activity="moderate">Moderately active</button>
          <button class="setup-button ${answers.activity === 'very' ? 'selected' : ''}" data-activity="very">Very active</button>
          <button class="setup-button ${answers.activity === 'extra' ? 'selected' : ''}" data-activity="extra">Extra active</button>
        </div>
      `,
      attachListeners: (card, answers) => {
        card.querySelectorAll('[data-activity]').forEach(btn => {
          btn.addEventListener('click', () => {
            answers.activity = btn.dataset.activity;
            renderStep();
          });
        });
      },
      validate: (answers) => answers.activity !== null,
    };
  }

  function createGoalStep() {
    return {
      render: (answers) => `
        <h2>What's your fitness goal?</h2>
        <div class="setup-button-group">
          <button class="setup-button ${answers.goal === 'lose' ? 'selected' : ''}" data-goal="lose">Lose weight</button>
          <button class="setup-button ${answers.goal === 'maintain' ? 'selected' : ''}" data-goal="maintain">Maintain</button>
          <button class="setup-button ${answers.goal === 'gain' ? 'selected' : ''}" data-goal="gain">Gain weight</button>
        </div>
      `,
      attachListeners: (card, answers) => {
        card.querySelectorAll('[data-goal]').forEach(btn => {
          btn.addEventListener('click', () => {
            answers.goal = btn.dataset.goal;
            renderStep();
          });
        });
      },
      validate: (answers) => answers.goal !== null,
    };
  }

  function createPreferenceStep() {
    return {
      render: (answers) => `
        <h2>Dietary preference?</h2>
        <div class="setup-button-group">
          <button class="setup-button ${answers.preference === 'balanced' ? 'selected' : ''}" data-preference="balanced">Balanced</button>
          <button class="setup-button ${answers.preference === 'high-protein' ? 'selected' : ''}" data-preference="high-protein">High-protein</button>
          <button class="setup-button ${answers.preference === 'low-carb' ? 'selected' : ''}" data-preference="low-carb">Low-carb</button>
          <button class="setup-button ${answers.preference === 'keto' ? 'selected' : ''}" data-preference="keto">Keto</button>
        </div>
      `,
      attachListeners: (card, answers) => {
        card.querySelectorAll('[data-preference]').forEach(btn => {
          btn.addEventListener('click', () => {
            answers.preference = btn.dataset.preference;
            renderStep();
          });
        });
      },
      validate: (answers) => answers.preference !== null,
    };
  }

  function createSummaryStep() {
    return {
      render: (answers) => {
        const targets = calculateTargets(answers);
        answers.targets = targets;

        return `
          <h2>Your Macro Targets</h2>
          <div class="summary-card">
            <div class="summary-row">
              <span class="summary-label">Calories</span>
              <span class="summary-value"><input type="number" class="target-calories" value="${targets.calories}" /></span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Protein (g)</span>
              <span class="summary-value"><input type="number" class="target-protein" value="${targets.protein}" /></span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Carbs (g)</span>
              <span class="summary-value"><input type="number" class="target-carbs" value="${targets.carbs}" /></span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Fat (g)</span>
              <span class="summary-value"><input type="number" class="target-fat" value="${targets.fat}" /></span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Fiber (g)</span>
              <span class="summary-value"><input type="number" class="target-fiber" value="${targets.fiber}" /></span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Sugar (g)</span>
              <span class="summary-value"><input type="number" class="target-sugar" value="${targets.sugar}" /></span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Sodium (mg)</span>
              <span class="summary-value"><input type="number" class="target-sodium" value="${targets.sodium}" /></span>
            </div>
          </div>
        `;
      },
      attachListeners: (card, answers) => {
        const inputs = {
          calories: card.querySelector('.target-calories'),
          protein: card.querySelector('.target-protein'),
          carbs: card.querySelector('.target-carbs'),
          fat: card.querySelector('.target-fat'),
          fiber: card.querySelector('.target-fiber'),
          sugar: card.querySelector('.target-sugar'),
          sodium: card.querySelector('.target-sodium'),
        };

        Object.entries(inputs).forEach(([key, input]) => {
          input.addEventListener('change', () => {
            answers.targets[key] = parseInt(input.value, 10);
          });
        });
      },
      validate: (answers) => answers.targets !== null,
    };
  }

  renderStep();
}
