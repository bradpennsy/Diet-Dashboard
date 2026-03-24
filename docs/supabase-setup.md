# Diet Dashboard — Supabase Setup Guide

> Copy this entire document and paste it to Claude (or any AI assistant) to set up your Supabase backend.

## Overview
This guide sets up the database schema and Edge Function needed for the Diet Dashboard.

## Prerequisites
- A Supabase project (create at supabase.com)
- Supabase CLI installed (optional, for Edge Function deployment)

## Database Schema

### Table: food_logs
```sql
CREATE TABLE food_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  meal_name TEXT NOT NULL,
  description TEXT,
  calories_kcal NUMERIC(7,1) NOT NULL DEFAULT 0,
  protein_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  carbs_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  fat_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  fiber_g NUMERIC(6,1) NOT NULL DEFAULT 0,
  sodium_mg NUMERIC(7,1) NOT NULL DEFAULT 0,
  sugar_g NUMERIC(6,1) NOT NULL DEFAULT 0
);
```

### Table: active_calories
```sql
CREATE TABLE active_calories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active_cal NUMERIC(7,1) NOT NULL DEFAULT 0,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);
```

### Row-Level Security
```sql
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_calories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own food_logs" ON food_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own food_logs" ON food_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users see own active_calories" ON active_calories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own active_calories" ON active_calories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Indexes
```sql
CREATE INDEX idx_food_logs_user_date ON food_logs(user_id, log_date);
CREATE INDEX idx_active_calories_user_date ON active_calories(user_id, log_date);
```

## Edge Function: dashboard-data

Create file: `supabase/functions/dashboard-data/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const today = new Date().toISOString().slice(0, 10);

  // Get daily aggregates
  const { data: daily, error: dailyErr } = await supabase
    .from("food_logs")
    .select("log_date, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g")
    .order("log_date", { ascending: true });

  if (dailyErr) {
    return new Response(JSON.stringify({ error: dailyErr.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  // Aggregate by date
  const byDate: Record<string, any> = {};
  for (const row of daily || []) {
    const d = row.log_date;
    if (!byDate[d]) {
      byDate[d] = {
        log_date: d,
        calories_kcal: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        fiber_g: 0,
        sodium_mg: 0,
        sugar_g: 0,
        active_cal: 0,
      };
    }
    byDate[d].calories_kcal += +row.calories_kcal || 0;
    byDate[d].protein_g += +row.protein_g || 0;
    byDate[d].carbs_g += +row.carbs_g || 0;
    byDate[d].fat_g += +row.fat_g || 0;
    byDate[d].fiber_g += +row.fiber_g || 0;
    byDate[d].sodium_mg += +row.sodium_mg || 0;
    byDate[d].sugar_g += +row.sugar_g || 0;
  }

  // Get active calories
  const { data: activeCals } = await supabase
    .from("active_calories")
    .select("log_date, active_cal");

  for (const row of activeCals || []) {
    if (byDate[row.log_date]) {
      byDate[row.log_date].active_cal = +row.active_cal || 0;
    }
  }

  // Get recent meals (last 14 days) for drill-down
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const cutoff = fourteenDaysAgo.toISOString().slice(0, 10);

  const { data: recentMeals } = await supabase
    .from("food_logs")
    .select("log_date, created_at, meal_type, meal_name, description, calories_kcal, protein_g, carbs_g, fat_g, sodium_mg")
    .gte("log_date", cutoff)
    .order("created_at", { ascending: true });

  const result = {
    daily: Object.values(byDate).sort((a: any, b: any) => a.log_date.localeCompare(b.log_date)),
    recent_meals: recentMeals || [],
    today_date: today,
  };

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

## Expected Response Shape

```json
{
  "daily": [
    {
      "log_date": "2026-03-01",
      "calories_kcal": 1850,
      "protein_g": 95,
      "carbs_g": 180,
      "fat_g": 62,
      "fiber_g": 28,
      "sodium_mg": 2100,
      "sugar_g": 45,
      "active_cal": 350
    }
  ],
  "recent_meals": [
    {
      "log_date": "2026-03-24",
      "created_at": "2026-03-24T12:30:00Z",
      "meal_type": "lunch",
      "meal_name": "Grilled Chicken Salad",
      "description": "Mixed greens, grilled chicken, vinaigrette",
      "calories_kcal": 450,
      "protein_g": 35,
      "carbs_g": 20,
      "fat_g": 22,
      "sodium_mg": 680
    }
  ],
  "today_date": "2026-03-24"
}
```

## Deployment

### Option A: Supabase Dashboard
1. Go to your Supabase project → SQL Editor
2. Run the CREATE TABLE and RLS statements above
3. Go to Edge Functions → Create New
4. Paste the Edge Function code
5. Deploy

### Option B: Supabase CLI
```bash
supabase init
supabase db push  # Runs migrations
supabase functions deploy dashboard-data
```

## Dashboard Connection
After deploying, your Edge Function URL will be:
`https://<your-project-id>.supabase.co/functions/v1/dashboard-data`

Enter this URL in the Diet Dashboard setup screen.

## Testing Your Connection

1. In the Diet Dashboard, go through the setup flow
2. When prompted for the Edge Function URL, paste your URL
3. Click "Test Connection" - you should see a success message
4. Complete setup and the dashboard will start loading your data

## Troubleshooting

- **Connection failed**: Verify the URL is correct and that your Supabase project is active
- **No data showing**: Ensure you've added food log entries in Supabase
- **RLS errors**: Check that Row Level Security policies are correctly set up
- **Edge Function timeout**: Verify the function code is correctly deployed with no syntax errors
