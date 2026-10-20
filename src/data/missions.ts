import { AuctionLot, BirthdayMajorityQuestion, TraitorObjective } from '../types/game';

// ----------------------------------------------------------------------
// TRAITOR OBJECTIVES FOR ALL 6 ROUNDS
// ----------------------------------------------------------------------
export const ROUND_1_TRAITOR_OBJECTIVE: TraitorObjective = {
  title: 'The Accomplice Delivery',
  description: 'Get another player to bring a specified ordinary household object during at least one scavenger stage.',
  conversationalGoal: 'Casually suggest or hint at an ordinary item (e.g., wooden spoon, shoe, or tea towel) to another player without disclosing your assignment.',
  successCondition: 'Another guest brings the target ordinary household object.',
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

// MISSION 1: THE CASTLE HEIST DATA
// ----------------------------------------------------------------------
export const HEIST_HOUSEHOLD_ITEMS_POOL = [
  'Wooden Spoon',
  'Tea Towel',
  'Shoe or Slipper',
  'Sofa Cushion',
  'Coffee Mug',
  'Paperback Book',
  'Coat Hanger',
  'Bunch of Keys',
];

export const HEIST_STAGES = [
  {
    stage: 1 as const,
    title: 'Stage 1: The Disguise',
    prompt: 'Find something you could wear to avoid recognition in the corridors of Jasmine’s Castle.',
    hint: 'Examples: An absurd hat, oversized scarf, tea towel bandana, dark sunglasses, or strange cardigan.',
  },
  {
    stage: 2 as const,
    title: 'Stage 2: The Treasure',
    prompt: 'Find the most impressive-looking object you believe is worth less than £5.',
    hint: 'Playful judgement only! Examples: A faux-gold trinket, an ornate coaster, a shiny spoon, or a vintage pebble.',
  },
  {
    stage: 3 as const,
    title: 'Stage 3: The Evidence',
    prompt: 'Find something that would look deeply suspicious sitting right beside Libby’s birthday cake.',
    hint: 'Examples: A screwdriver, a padlock, an empty envelope, rubber gloves, or a roll of duct tape.',
  },
];

// ----------------------------------------------------------------------
// MISSION 2: THE BIRTHDAY MAJORITY QUESTION BANK
// ----------------------------------------------------------------------
export const BIRTHDAY_MAJORITY_QUESTION_POOL: BirthdayMajorityQuestion[] = [
  { id: 1, prompt: 'Who would accidentally reveal they were the Traitor within 30 seconds?' },
  { id: 2, prompt: 'Who would flourish the most as an extremely minor, eccentric royal?' },
  { id: 3, prompt: 'Who would mistakenly befriend the murderer in a Scottish horror film?' },
  { id: 4, prompt: 'Who would spend the entire castle prize fund before actually winning it?' },
  { id: 5, prompt: 'Who would deliver the most unnecessary, tearful acceptance speech?' },
  { id: 6, prompt: 'Who would survive the longest locked alone inside Jasmine’s Castle?' },
  { id: 7, prompt: 'Who would with 100% confidence accuse the completely wrong person?' },
];

// ----------------------------------------------------------------------
// MISSION 3: THE FORGERY GALLERY BRIEFS
// ----------------------------------------------------------------------
export const FORGERY_BRIEF_PAIRS = [
  {
    faithful: 'Libby accepting an Oscar (Include: Libby on red carpet, shiny gold statuette, microphone, red curtain, camera crew)',
    traitor: 'Libby being crowned Queen (Include: Libby on throne, jewelled crown, royal sceptre, velvet curtain, royal guards)',
    theme: 'Libby’s Grand Moment',
  },
  {
    faithful: 'A disastrous birthday party (Include: Birthday cake collapsing, melted candles, popping balloon, fire extinguisher, party hat)',
    traitor: 'A disastrous wedding (Include: Tiered wedding cake falling, burning candle, champagne fountain spilling, confetti, veil)',
    theme: 'Catastrophic Celebration',
  },
  {
    faithful: 'A lavish royal banquet in Jasmine’s Castle (Include: Roast feast, gold goblet, banquet table, candelabra, royal banner)',
    traitor: 'An chaotic school dinner hall (Include: Slop tray, plastic cup, cafeteria table, milk carton, school chalkboard)',
    theme: 'Feast of Deception',
  },
  {
    faithful: 'A luxury cruise deck (Include: Swimming pool, deck chair, sun umbrella, captain’s bridge, cocktail glass)',
    traitor: 'A swashbuckling pirate ship (Include: Skull flag, wooden plank, treasure chest, ship mast, rum bottle)',
    theme: 'Seafaring Vessel',
  },
];

// ----------------------------------------------------------------------
// MISSION 4: THE BODY DISPOSAL COMMITTEE DATA
// ----------------------------------------------------------------------
export const BODY_DISPOSAL_SCENARIO =
  'The Duchess has unexpectedly expired during dessert at Jasmine’s Castle. The police inspector arrives in exactly five minutes. Your only getaway vehicle is a tandem bicycle, and somebody has already tipped off the local constabulary that all seven of you are in the parlour.';

export const BODY_DISPOSAL_OBJECTS_POOL = [
  'A Feather Duster',
  'An Umbrella',
  'A Kitchen Ladle',
  'A Roll of Toilet Paper',
  'A Pair of Oven Gloves',
  'A Wall Calendar',
  'A Bed Pillow',
  'A House Plant',
];

// ----------------------------------------------------------------------
// MISSION 5: THE COUNTERFEIT EXPERT INVENTIONS
// ----------------------------------------------------------------------
export const COUNTERFEIT_INVENTIONS = [
  {
    invention: 'A Birthday Cake Fitted with a High-Tech Security System',
    faithfulThreeWords: ['Laser', 'Fondant', 'Siren'] as [string, string, string],
    traitorTwoWords: ['Laser', 'Fondant'] as [string, string],
    missingThirdWord: 'Siren',
  },
  {
    invention: 'An Umbrella Specifically Designed for Your Shoes',
    faithfulThreeWords: ['Puddle', 'Waterproof', 'Elastic'] as [string, string, string],
    traitorTwoWords: ['Puddle', 'Waterproof'] as [string, string],
    missingThirdWord: 'Elastic',
  },
  {
    invention: 'A Fully Waterproof, Submersible Teabag',
    faithfulThreeWords: ['Submarine', 'Kettle', 'Earl Grey'] as [string, string, string],
    traitorTwoWords: ['Submarine', 'Kettle'] as [string, string],
    missingThirdWord: 'Earl Grey',
  },
  {
    invention: 'A Self-Folding False Moustache with WiFi Capability',
    faithfulThreeWords: ['Adhesive', 'Bluetooth', 'Whiskers'] as [string, string, string],
    traitorTwoWords: ['Adhesive', 'Bluetooth'] as [string, string],
    missingThirdWord: 'Whiskers',
  },
];

// ----------------------------------------------------------------------
// MISSION 6: THE GETAWAY AUCTION LOTS
// ----------------------------------------------------------------------
export const AUCTION_LOTS: AuctionLot[] = [
  {
    lotNumber: 1,
    title: 'A Shovel. No Questions Asked.',
    description: 'Sturdy steel spade with wooden handle. Pristine condition, zero forensic history. Essential for late-night castle gardening.',
    escapePoints: 1,
  },
  {
    lotNumber: 2,
    title: 'A Disguise Consisting Entirely of a False Moustache.',
    description: 'Impeccable synthetic bristles. Transforms any suspect into an innocent French sommelier or vintage explorer.',
    escapePoints: 2,
  },
  {
    lotNumber: 3,
    title: 'A Convincing Alibi.',
    description: 'Two verified museum receipts and a handwritten testimony swearing you were admiring 17th-century tapestries in Inverness.',
    escapePoints: 3,
  },
  {
    lotNumber: 4,
    title: 'A Passport in Someone Else’s Name.',
    description: 'Clean European travel document belonging to one "Lord Archibald Dunmore-Smythe". Just practice the signature.',
    escapePoints: 4,
  },
  {
    lotNumber: 5,
    title: 'The Only Working Getaway Car (It’s a Fiat Panda).',
    description: '1.2L engine, manual choke, one squeaky wiper blade. She doesn’t look fast, but the police won’t suspect a thing.',
    escapePoints: 5,
  },
  {
    lotNumber: 6,
    title: 'The CCTV Footage. All of It.',
    description: 'A glowing red USB stick containing every second of castle security camera recordings from tonight. Absolute immunity.',
    escapePoints: 6,
  },
];

export const FORGERY_SUBJECT_PAIRS = FORGERY_BRIEF_PAIRS;
