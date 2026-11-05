import { getMealCategoriesAndAreas } from '../../server/utils/meals'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders }
  }

  const result = getMealCategoriesAndAreas()
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify(result)
  }
}

