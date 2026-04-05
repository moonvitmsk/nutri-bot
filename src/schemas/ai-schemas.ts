// JSON Schemas for OpenAI Structured Outputs (Responses API)

export const FOOD_ANALYSIS_SCHEMA = {
  name: 'food_analysis',
  strict: true,
  schema: {
    type: 'object' as const,
    properties: {
      food_items: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            name_ru: { type: 'string' as const },
            name_en: { type: 'string' as const },
            weight_grams: { type: 'number' as const },
            confidence: { type: 'number' as const },
            calories: { type: 'number' as const },
            protein: { type: 'number' as const },
            fat: { type: 'number' as const },
            carbs: { type: 'number' as const },
            fiber: { type: 'number' as const },
          },
          required: ['name_ru', 'weight_grams', 'confidence', 'calories', 'protein', 'fat', 'carbs'] as const,
          additionalProperties: false as const,
        },
      },
      total_calories: { type: 'number' as const },
      total_protein: { type: 'number' as const },
      total_fat: { type: 'number' as const },
      total_carbs: { type: 'number' as const },
      meal_type: {
        type: 'string' as const,
        enum: ['breakfast', 'lunch', 'dinner', 'snack', 'drink'] as const,
      },
      is_food: { type: 'boolean' as const },
      comment: { type: 'string' as const },
    },
    required: ['food_items', 'total_calories', 'total_protein', 'total_fat', 'total_carbs', 'is_food'] as const,
    additionalProperties: false as const,
  },
};

export const LAB_ANALYSIS_SCHEMA = {
  name: 'lab_analysis',
  strict: true,
  schema: {
    type: 'object' as const,
    properties: {
      markers: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            name: { type: 'string' as const },
            value: { type: 'number' as const },
            unit: { type: 'string' as const },
            reference_min: { type: 'number' as const },
            reference_max: { type: 'number' as const },
            status: {
              type: 'string' as const,
              enum: ['low', 'normal', 'high'] as const,
            },
          },
          required: ['name', 'value', 'unit', 'status'] as const,
          additionalProperties: false as const,
        },
      },
      lab_name: { type: 'string' as const },
      date: { type: 'string' as const },
      summary: { type: 'string' as const },
      recommendations: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
    },
    required: ['markers', 'summary', 'recommendations'] as const,
    additionalProperties: false as const,
  },
};

export const SUPPLEMENT_OCR_SCHEMA = {
  name: 'supplement_ocr',
  strict: true,
  schema: {
    type: 'object' as const,
    properties: {
      product_name: { type: 'string' as const },
      brand: { type: 'string' as const },
      ingredients: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            name: { type: 'string' as const },
            amount: { type: 'string' as const },
            unit: { type: 'string' as const },
            daily_value_percent: { type: 'number' as const },
          },
          required: ['name'] as const,
          additionalProperties: false as const,
        },
      },
      serving_size: { type: 'string' as const },
      warnings: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
      is_supplement: { type: 'boolean' as const },
    },
    required: ['product_name', 'ingredients', 'is_supplement'] as const,
    additionalProperties: false as const,
  },
};
