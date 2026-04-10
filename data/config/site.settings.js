import { metadata } from './metadata.js';

/** @type {import("./siteSettingsInterface.ts").SiteConfig} */
const siteConfig = {
  ...metadata,

  // Configure analytics
  disableAnalytics: false, // Disable all analytics on the site
  analytics: {
    // By default Vercel analytics is enabled.
    // If you want to use an analytics provider you have to add it to the
    // content security policy in the `next.config.js` file.
  },

  newsletter: {
    // Optional: enable newsletter
    // provider: 'emailoctopus',
  },
  search: true, // Enable or disable search
};

export { siteConfig };
export default siteConfig;
