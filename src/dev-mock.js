/**
 * Dev mock data — used when ?dev is in the URL.
 * Generates 30 days of realistic fake diet data ending today.
 */

function mockDailyData() {
  const days = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');

    // Randomish but plausible values
    const rand = (base, spread) => Math.round(base + (Math.random() - 0.5) * spread * 2);

    days.push({
      log_date: dateStr,
      calories_kcal: rand(1900, 300),
      protein_g: rand(130, 25),
      carbs_g: rand(175, 40),
      fat_g: rand(65, 15),
      fiber_g: rand(26, 8),
      sodium_mg: rand(2100, 500),
      sugar_g: rand(38, 15),
      active_cal: rand(250, 150),
    });
  }

  return days;
}

function mockMeals(todayStr) {
  const items = [
    { name: 'Oatmeal', calories_kcal: 320, protein_g: 12, carbs_g: 54, fat_g: 6, fiber_g: 8, sodium_mg: 120, sugar_g: 10 },
    { name: 'Greek Yogurt', calories_kcal: 150, protein_g: 17, carbs_g: 9, fat_g: 4, fiber_g: 0, sodium_mg: 65, sugar_g: 7 },
    { name: 'Chicken & Rice', calories_kcal: 520, protein_g: 48, carbs_g: 55, fat_g: 10, fiber_g: 3, sodium_mg: 480, sugar_g: 2 },
    { name: 'Protein Shake', calories_kcal: 200, protein_g: 30, carbs_g: 14, fat_g: 3, fiber_g: 1, sodium_mg: 180, sugar_g: 5 },
    { name: 'Salmon & Veggies', calories_kcal: 450, protein_g: 40, carbs_g: 22, fat_g: 18, fiber_g: 6, sodium_mg: 420, sugar_g: 8 },
  ];

  const now = new Date();
  return items.map((item, idx) => ({
    ...item,
    log_date: todayStr,
    meal_name: item.name,
    created_at: new Date(now.getTime() - (items.length - idx) * 90 * 60000).toISOString(),
  }));
}

export function getMockDashboardData() {
  const today = new Date();
  const todayStr = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');

  const daily = mockDailyData();

  // Make today's entry partial (in-progress)
  const todayEntry = daily.find(d => d.log_date === todayStr);
  if (todayEntry) {
    todayEntry.calories_kcal = 1120;
    todayEntry.protein_g = 72;
    todayEntry.carbs_g = 98;
    todayEntry.fat_g = 30;
    todayEntry.fiber_g = 13;
    todayEntry.sodium_mg = 1050;
    todayEntry.sugar_g = 20;
    todayEntry.active_cal = 180;
  }

  return {
    daily,
    recent_meals: mockMeals(todayStr),
    today_date: todayStr,
  };
}

export const DEV_CONFIG = {
  apiUrl: '__dev__',
  targets: {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fat: 70,
    fiber: 30,
    sugar: 50,
    sodium: 2300,
  },
  trackActiveBurn: true,
  palette: 'cream',
  gridLayout: null,
  dateRange: '14d',
};
