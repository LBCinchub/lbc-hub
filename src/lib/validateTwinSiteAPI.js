/**
 * Validates incoming requests from lbchub.site
 * Call this in your backend functions to check if the request has a valid API key
 */
export function validateTwinSiteAPI(req) {
  const apiKey = req.headers.get('x-twin-site-api-key') || 
                 req.headers.get('authorization')?.replace('Bearer ', '');
  
  const validKey = Deno.env.get('TWIN_SITE_API_KEY');
  
  if (!apiKey || !validKey || apiKey !== validKey) {
    return false;
  }
  
  return true;
}