export function renderTargetEditor(container, targets, onChange) {
  container.innerHTML = '';

  const form = document.createElement('div');
  form.className = 'settings-form-group';

  const fields = [
    { key: 'calories', label: 'Daily Calories (kcal)', min: 1000, max: 5000 },
    { key: 'protein', label: 'Protein (g)', min: 10, max: 300 },
    { key: 'carbs', label: 'Carbs (g)', min: 20, max: 500 },
    { key: 'fat', label: 'Fat (g)', min: 10, max: 200 },
    { key: 'fiber', label: 'Fiber (g)', min: 5, max: 100 },
    { key: 'sugar', label: 'Sugar (g)', min: 0, max: 100 },
    { key: 'sodium', label: 'Sodium (mg)', min: 0, max: 5000 },
  ];

  fields.forEach(field => {
    const group = document.createElement('div');
    group.className = 'settings-form-group';

    const label = document.createElement('label');
    label.className = 'settings-label';
    label.textContent = field.label;

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'settings-input';
    input.value = targets[field.key];
    input.min = field.min;
    input.max = field.max;

    input.addEventListener('change', () => {
      const newVal = parseInt(input.value, 10);
      if (!isNaN(newVal) && newVal >= field.min && newVal <= field.max) {
        const draft = { ...targets };
        draft[field.key] = newVal;
        onChange(draft);
      }
    });

    group.appendChild(label);
    group.appendChild(input);
    form.appendChild(group);
  });

  container.appendChild(form);
}
