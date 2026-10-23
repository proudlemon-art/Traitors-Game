import type { AuctionLot, BirthdayMajorityQuestion, TraitorObjective } from '../types/game.ts';

// ----------------------------------------------------------------------
// TRAITOR OBJECTIVES FOR ALL 6 ROUNDS
// ----------------------------------------------------------------------
export const ROUND_1_TRAITOR_OBJECTIVE: TraitorObjective = {
  title: 'The Planted Exhibit',
  description: 'Persuade the group to choose your secret planted household object as Exhibit A.',
  conversationalGoal: 'Steer the investigation so everyone believes selecting your planted object was their own brilliant idea.',
  successCondition: 'The Traitor’s secret planted object is chosen as the final Exhibit A.',
};

export const ROUND_2_TRAITOR_OBJECTIVE: TraitorObjective = {
  title: 'The Deliberate Detour',
  description: 'Convince your assigned target Faithful to submit an incorrect prediction on a specified question.',
  conversationalGoal: 'Lobby or sway opinion casually during the discussion before predictions are locked.',
  successCondition: 'Target Faithful locks an incorrect majority prediction on the assigned question.',
};

export const ROUND_3_TRAITOR_OBJECTIVE: TraitorObjective = {
  title: 'Framing the Artist',
  description: 'You received a slightly different drawing prompt. Get another player to accuse an innocent Faithful of having the wrong drawing.',
  conversationalGoal: 'During sketch presentations, playfully question strange details in an innocent Faithful player’s drawing.',
  successCondition: 'Another guest publicly suspects or accuses an innocent Faithful of having the wrong drawing.',
};

export const ROUND_4_TRAITOR_OBJECTIVE: TraitorObjective = {
  title: 'The Contraband Smuggle',
  description: 'You are secretly assigned 1 specific object. You must get another player to fetch or nominate that object into the committee’s final five.',
  conversationalGoal: 'Convince someone else that your assigned object is vital for the tandem bicycle getaway.',
  successCondition: 'Another player fetches or votes your assigned item into the final five.',
};

export const ROUND_5_TRAITOR_OBJECTIVE: TraitorObjective = {
  title: 'The Counterfeit Smuggler',
  description: 'You only received 2 required words (missing the 3rd). Listen carefully to the pitches, deduce the missing word, and use it in your pitch or guess it.',
  conversationalGoal: 'Deliver a convincing 30-second pitch while smoothly sneaking in the deduced 3rd word.',
  successCondition: 'Traitor uses or correctly identifies the missing 3rd word.',
};

export const ROUND_6_TRAITOR_OBJECTIVE: TraitorObjective = {
  title: 'The Grand Depletion',
  description: 'Manipulate the bidding so that your assigned target Faithful wins 0 lots or exhausts their coins on low-value items.',
  conversationalGoal: 'Drive up bidding prices on early lots and bait your target into overspending.',
  successCondition: 'Target Faithful ends the auction with 0 lots won or fewest escape points.',
};

export const TRAITOR_OBJECTIVES: Record<number, TraitorObjective> = {
  1: ROUND_1_TRAITOR_OBJECTIVE,
  2: ROUND_2_TRAITOR_OBJECTIVE,
  3: ROUND_3_TRAITOR_OBJECTIVE,
  4: ROUND_4_TRAITOR_OBJECTIVE,
  5: ROUND_5_TRAITOR_OBJECTIVE,
  6: ROUND_6_TRAITOR_OBJECTIVE,
};

// ----------------------------------------------------------------------
// MISSION 1: EXHIBIT A EXAMPLES & DEFAULTS
// ----------------------------------------------------------------------
export const EXHIBIT_A_EXAMPLES = [
  'Ornate Brass Key',
  'Black Leather Glove',
  'Poison Decanter Flask',
  'Antique Pocket Watch & Chain',
  'Crimson Damask Handkerchief',
  'Wax-Sealed Secret Envelope',
  'Engraved Silver Spoon',
  'Forensics Evidence Bag',
  'Wooden Spoon',
  'Tea Towel',
  'Shoe or Slipper',
  'Candlestick',
  'Coffee Mug',
];

// ----------------------------------------------------------------------
// MISSION 2: THE BIRTHDAY MAJORITY QUESTION BANK
// ----------------------------------------------------------------------
export const BIRTHDAY_MAJORITY_QUESTION_POOL: BirthdayMajorityQuestion[] = [
  { id: 1, prompt: 'Who would say “I’m absolutely fine” while putting their key into the wrong front door?' },
  { id: 2, prompt: 'Who would spend £70 on a night out and decide the £3 delivery fee on a kebab was taking the piss?' },
  { id: 3, prompt: 'Who would rehearse saying “here” before a roll call and still say it fucking weirdly?' },
  { id: 4, prompt: 'Who would say “you too” when a waiter says “enjoy your meal” and still be thinking about it at bedtime?' },
  { id: 5, prompt: 'Who would hear “last orders” and buy enough drinks to turn going home into tomorrow’s problem?' },
];

// ----------------------------------------------------------------------
// MISSION 3: THE FORGERY GALLERY PAIRS
// ----------------------------------------------------------------------
export const FORGERY_BRIEF_PAIRS = [
  {
    faithful: 'A smug butler serving high tea in the castle courtyard with a miniature dachshund and a grandfather clock.',
    traitor: 'A frantic waiter balancing a wedding cake on a windy Scottish golf course with a terrier and a sundial.',
  },
  {
    faithful: 'A Victorian sea captain wearing a monocle steering a rowing boat through thick Scottish fog with a lantern and a parrot.',
    traitor: 'A medieval pirate wearing an eyepatch paddling a canoe near a dramatic waterfall with a torch and an owl.',
  },
  {
    faithful: 'A flamboyant aristocrat playing the grand piano inside the castle library while an owl perches on a marble bust.',
    traitor: 'An eccentric maestro playing a harp inside an overgrown castle conservatory while a raven perches on a gargoyle.',
  },
];

// ----------------------------------------------------------------------
// MISSION 4: THE BODY DISPOSAL COMMITTEE DATA
// ----------------------------------------------------------------------
export const BODY_DISPOSAL_SCENARIO =
  'The Duchess has expired during dessert. The inspector is five minutes away, your getaway vehicle is a tandem bicycle, and the police already know you are here. Seven objects have been scavenged from Jasmine’s Castle. Together, select five objects and construct an airtight getaway story in sixty seconds.';

export const BODY_DISPOSAL_OBJECTS_POOL = [
  'Wooden Spoon',
  'Tea Towel',
  'Shoe or Slipper',
  'Sofa Cushion',
  'Coffee Mug',
  'Coat Hanger',
  'Bunch of Keys',
  'Roll of Foil',
  'Umbrella',
  'Empty Wine Bottle',
];

// ----------------------------------------------------------------------
// MISSION 5: THE COUNTERFEIT EXPERT INVENTIONS
// ----------------------------------------------------------------------
export const COUNTERFEIT_INVENTIONS = [
  {
    invention: 'The Whispering Teapot',
    faithfulThreeWords: ['Porcelain', 'Steam', 'Gossip'] as [string, string, string],
    traitorTwoWords: ['Porcelain', 'Steam'] as [string, string],
    missingThirdWord: 'Gossip',
  },
  {
    invention: 'The Velvet Umbrella',
    faithfulThreeWords: ['Raindrops', 'Canopy', 'Aristocrat'] as [string, string, string],
    traitorTwoWords: ['Raindrops', 'Canopy'] as [string, string],
    missingThirdWord: 'Aristocrat',
  },
  {
    invention: 'The Clockwork Snuffbox',
    faithfulThreeWords: ['Brass', 'Spring', 'Treason'] as [string, string, string],
    traitorTwoWords: ['Brass', 'Spring'] as [string, string],
    missingThirdWord: 'Treason',
  },
];

// ----------------------------------------------------------------------
// MISSION 6: THE GETAWAY AUCTION LOTS
// ----------------------------------------------------------------------
export const AUCTION_LOTS: AuctionLot[] = [
  {
    lotNumber: 1,
    title: 'The Rusty Highland Bicycle',
    description: 'Squeaks dramatically on gravel. One flat tyre, but definitely faster than walking in formal attire.',
    escapePoints: 1,
  },
  {
    lotNumber: 2,
    title: 'A Pair of Heavy Tweed Cloaks',
    description: 'Smells faintly of wet sheep and ancient secrets. Ideal for blending seamlessly into a Scottish bog.',
    escapePoints: 2,
  },
  {
    lotNumber: 3,
    title: 'Forged Diplomatic Passports',
    description: 'Stamped with the seal of a country that ceased to exist in 1912. Confident posture required at border control.',
    escapePoints: 3,
  },
  {
    lotNumber: 4,
    title: 'The Castle Dungeon Master Key',
    description: 'Opens every medieval door, wine cellar, and subterranean escape tunnel under Jasmine’s Castle.',
    escapePoints: 4,
  },
  {
    lotNumber: 5,
    title: 'The Estate Gamekeeper’s Land Rover',
    description: 'Starts seven times out of ten. Half a tank of red diesel and a glove compartment full of shortbread.',
    escapePoints: 5,
  },
  {
    lotNumber: 6,
    title: 'The Midnight Seaplane Ticket',
    description: 'Departing Loch Ness at midnight sharp. Direct non-stop flight to an undisclosed non-extradition island.',
    escapePoints: 6,
  },
];
