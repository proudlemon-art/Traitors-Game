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
// MISSION 3: THE FORGERY GALLERY PAIRS (RANDOMIZED & COIN-FLIPPED AT RUNTIME)
// Neither the Host Display nor the app creator knows which side of the pair
// was dealt to the 6 Faithful vs the 1 Traitor!
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
  {
    faithful: 'A royal detective inspecting muddy footprints outside the castle wine cellar with a magnifying glass and a bloodhound.',
    traitor: 'A nervous groundskeeper hiding a golden trophy behind the castle greenhouse with a shovel and a badger.',
  },
  {
    faithful: 'A Scottish duchess riding a penny-farthing bicycle across a stone drawbridge with a champagne flute and a swan.',
    traitor: 'A Highland lord riding a tandem scooter past a medieval turret with a candelabra and a peacock.',
  },
  {
    faithful: 'A glamorous opera singer toasting by a roaring castle fireplace with a crystal decanter, a pug, and a portrait.',
    traitor: 'A mysterious fortune teller reading tarot cards by candlelight in a stone tower with a black cat and a cauldron.',
  },
  {
    faithful: 'A chef in a tall hat flambeing a birthday pudding in the castle kitchen with a copper pan and a stealing mouse.',
    traitor: 'A medieval alchemist brewing a bubbling potion in the castle dungeon with a mortar and pestle and a frog.',
  },
  {
    faithful: 'A sleepy duke soaking in a clawfoot bathtub on the castle roof with a rubber duck, a telescope, and a crown.',
    traitor: 'A knight in shining armour lounging in a hammock between two castle cannons with a lute and a goblet.',
  },
];

// ----------------------------------------------------------------------
// MISSION 4: THE BODY DISPOSAL COMMITTEE DATA
// Uses objects carried over from Round 1 (Exhibit A) + fallback pool!
// ----------------------------------------------------------------------
export const BODY_DISPOSAL_SCENARIO =
  'The Duchess has expired during dessert. The inspector is five minutes away, your getaway vehicle is a tandem bicycle, and the police already know you are here. The household objects from Round 1 have returned to the parlour. Together, select five objects and construct an airtight getaway story in sixty seconds.';

export const BODY_DISPOSAL_OBJECTS_POOL = [
  'Antique Pocket Watch',
  'Black Leather Glove',
  'Crimson Handkerchief',
  'Ornate Brass Key',
  'Poison Decanter Flask',
  'Wax-Sealed Letter',
  'Engraved Silver Spoon',
  'Wooden Spoon',
  'Tea Towel',
  'Roll of Foil',
];

// ----------------------------------------------------------------------
// MISSION 5: THE COUNTERFEIT EXPERT INVENTIONS (RANDOMIZED WORD DRAWS)
// At runtime, 3 words are randomly drawn from candidateWords for the Faithful,
// and 1 of those 3 is randomly hidden from the Traitor — so even the person
// who wrote the app cannot know the missing word if they are the Traitor!
// ----------------------------------------------------------------------
export const COUNTERFEIT_INVENTIONS = [
  {
    invention: 'The Self-Pouring Midnight Wine Goblet',
    faithfulThreeWords: ['Velvet', 'Gravity', 'Alibi'] as [string, string, string],
    traitorTwoWords: ['Velvet', 'Gravity'] as [string, string],
    missingThirdWord: 'Alibi',
    candidateWords: ['Velvet', 'Gravity', 'Alibi', 'Chandelier', 'Hangover', 'Monocle', 'Cellar', 'Scandal'],
  },
  {
    invention: 'The Whispering Porcelain Teapot',
    faithfulThreeWords: ['Porcelain', 'Steam', 'Gossip'] as [string, string, string],
    traitorTwoWords: ['Porcelain', 'Steam'] as [string, string],
    missingThirdWord: 'Gossip',
    candidateWords: ['Porcelain', 'Steam', 'Gossip', 'Earl', 'Eavesdrop', 'Biscuit', 'Silver', 'Poison'],
  },
  {
    invention: 'The Anti-Paranoia Highland Cloak',
    faithfulThreeWords: ['Tartan', 'Shadow', 'Dagger'] as [string, string, string],
    traitorTwoWords: ['Tartan', 'Shadow'] as [string, string],
    missingThirdWord: 'Dagger',
    candidateWords: ['Tartan', 'Shadow', 'Dagger', 'Heather', 'Whisky', 'Fortress', 'Disguise', 'Bagpipe'],
  },
  {
    invention: 'The Clockwork Alibi Pocket Watch',
    faithfulThreeWords: ['Brass', 'Pendulum', 'Treason'] as [string, string, string],
    traitorTwoWords: ['Brass', 'Pendulum'] as [string, string],
    missingThirdWord: 'Treason',
    candidateWords: ['Brass', 'Pendulum', 'Treason', 'Detective', 'Hypnosis', 'Midnight', 'Gearbox', 'Witness'],
  },
  {
    invention: 'The Royal Corgi Translator Collar',
    faithfulThreeWords: ['Sausage', 'Majesty', 'Barking'] as [string, string, string],
    traitorTwoWords: ['Sausage', 'Majesty'] as [string, string],
    missingThirdWord: 'Barking',
    candidateWords: ['Sausage', 'Majesty', 'Barking', 'Throne', 'Biscuits', 'Tiara', 'Butler', 'Pedigree'],
  },
  {
    invention: 'The Jet-Powered Tandem Getaway Bicycle',
    faithfulThreeWords: ['Pedals', 'Turbo', 'Duchess'] as [string, string, string],
    traitorTwoWords: ['Pedals', 'Turbo'] as [string, string],
    missingThirdWord: 'Duchess',
    candidateWords: ['Pedals', 'Turbo', 'Duchess', 'Gravel', 'Parachute', 'Inspector', 'Handlebars', 'Escape'],
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
