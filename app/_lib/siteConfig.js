// The product's own identity. Each client's company name, tagline and
// invoice details live in their database (Settings > Company & Invoice) and
// reach the screens through getBranding() in data-service.js. These values
// are only the fallbacks: before the database answers, and on the parts of
// the product that are the same for every client.
export const siteConfig = {
  productName: "Factory Manager",
  productTagline: "Factory Management",

  // Shown until a client's own details load
  fallbackCompanyName: "Your Company Name",
  fallbackShortName: "Factory Manager",

  currencySymbol: "Rs",
  locale: "en-PK",
  timeZone: "Asia/Karachi",
};
