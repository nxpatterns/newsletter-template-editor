import { CLOUDLIB_CAMPAIGN_V1 } from './cloudlib-campaign.v1';

/** English copy of the CloudLib demo, keyed by block id; layout, colors and logo come from the German seed. */
const BLOCK_TEXTS_EN: Record<string, Record<string, unknown>> = {
  'bmo8rynqo-1': {
    label: 'We mean it. Thousands do it every day:',
    headline: 'How do people walk into your business when the door is closed?',
  },
  'bmo8rynqo-2': { title: 'One of these two answers is costing you sales' },
  'bmo91avmn-1': { quote: '“Is it your business they see, or your competitor’s?”' },
  'bmo8rynqo-3': {
    html: 'If you don’t show your business, you leave the first impression to chance, or to the competitor who does.<br><br><span style="color:rgb(212,212,212)">Nobody books a hotel room without photos. Why would anyone visit your business without seeing it first?</span>',
  },
  'bmo91hc4d-1': { quote: '“Long before a customer opens your door, the decision is made online.”' },
  'bmo8rynqo-5': { title: 'Your reach. Our job.' },
  'bmo8rynqo-6': {
    html: '<span style="color:rgb(235,241,250)"><strong>cloudlib.eu</strong></span> is not just another business directory.<br>It is the only international platform built exclusively for businesses with 360° imagery - the starting point for everything that creates reach.<br><br>More than 22,000 businesses in 9 countries already use <strong>cloudlib.eu</strong> to grow their sales. One listing turns into Google Street View, promo videos, social media channels and attention you can measure.<br><br><span style="font-size:26px"><em>No need to hunt for online multipliers; we bring visibility straight to you.</em></span>',
  },
  'bmo8rynqo-7': {
    number: '22,000+',
    label: '3D tours online',
    geo: 'Austria · Germany\nSwitzerland · South Tyrol\nSweden · Belgium\nNetherlands · Liechtenstein\nLuxembourg +++',
  },
  'bmo8rynqo-8': { title: 'What this means for you' },
  'bmo8rynqo-9': {
    html: '<span style="color:rgb(50,187,255)">Your photos become virtual tours, and if you like, much more: promo videos, social media content and a professional online presence.</span><br><br>Your visibility grows on a second, independent channel - <strong>alongside Google, not instead of it.</strong>',
  },
  'bmo8rynqo-a': {
    items: [
      { icon: '›', text: 'Your own business listing on cloudlib.eu' },
      { icon: '›', text: 'Virtual tours from your existing or newly shot 360° images' },
      { icon: '›', text: 'Ready to use for promo videos and social media platforms' },
      { icon: '›', text: 'Personal setup by our team - nothing for you to configure' },
    ],
  },
  'bmo8rynqo-b': {
    badge: 'Launch offer - 50% off',
    periodLabel: 'net / year',
    strikeLabel: 'Instead of',
    details: 'No automatic renewal  ·  No hidden costs  ·  Cancel anytime',
    fine: 'This offer is available for a limited time only and to a limited number of businesses.',
  },
  'bmo8rynqo-c': { title: 'See for yourself' },
  'bmo8rynqo-d': {
    html: 'Visit <strong>cloudlib.eu</strong> and see how other businesses already present themselves. Search by industry or region - the impression speaks for itself.',
  },
  'bmo8rynqo-e': { text: 'Explore the 3D portal' },
  'bmo8rynqo-f': {
    items: [
      {
        icon: '→',
        label: 'Book a call:',
        intro: 'We will call you back - ',
        linkText: 'Pick a time',
        href: 'https://cloudlib.eu/home/contact',
      },
      {
        icon: '•',
        label: 'Just reply:',
        intro: 'A short reply is all it takes - we will get back to you right away',
        linkText: '',
        href: '',
      },
    ],
  },
};

const GLOBALS_EN = {
  campaignSubject: 'How do people walk into your business when the door is closed?',
  preheader:
    'Your customers are not naive. They compare. Quickly. Quietly. And rarely give a second chance.\n\nWhat does someone see when they find your business online? A logo, an address - or your business, ready to walk through in 3D?\n\n22,000 businesses in nine countries have already changed that, with 3D tours people can step into straight from Google and social media.',
  legal: {
    noticeHtml:
      'You are receiving this email because you are in touch with us about your 360° presence. You can unsubscribe at any time using the link in the footer.',
    privacyLabel: 'Privacy',
    imprintLabel: 'Imprint',
    unsubscribeLabel: 'Unsubscribe',
    viewInBrowserLabel: 'View in browser',
  },
};

/** Full CloudLib demo campaign in English (same blocks and ids as the German seed). */
export function cloudlibCampaignEn(): typeof CLOUDLIB_CAMPAIGN_V1 {
  const de = structuredClone(CLOUDLIB_CAMPAIGN_V1);
  return {
    ...de,
    globals: {
      ...de.globals,
      campaignSubject: GLOBALS_EN.campaignSubject,
      preheader: GLOBALS_EN.preheader,
      legal: { ...de.globals.legal, ...GLOBALS_EN.legal },
    },
    blocks: de.blocks.map((b) => ({ ...b, ...(BLOCK_TEXTS_EN[b.id] ?? {}) })) as typeof de.blocks,
  };
}
