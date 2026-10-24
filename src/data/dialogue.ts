export interface HostDialogueSet {
  intro: string;
  roleBriefing: string;
  missionStart: string;
  roundTable: string;
  votingOpen: string;
  allVotesLocked: string;
  phoneSlateTurn: (playerName: string) => string;
  voteConfirmedSlate: (voterName: string, targetName: string) => string;
  banishment: (targetName: string, isTraitor: boolean) => string;
  tieOccurred: (names: string[]) => string;
  tieBanishmentFailed: string;
  assignmentReveal: (traitorName: string, objectiveTitle: string) => string;
  roundSummary: (roundNum: number, winnerTeam: string) => string;
  finalResults: (winnerName: string) => string;
}

export const JASMINE_FORFEIT_APOLOGY = `Jasmine. Your Majesty.

I’ve been an absolute fucking embarrassment.

Seven people in a room. One liar. And somehow I needed more information.

I defended them, Jasmine. Passionately. They must have thought, “Oh, lovely. This idiot’s doing it for me.”

You’ve shown better judgement eating something you found under a hedge.

I’d say I was stabbed in the back, but frankly I held the door open, pointed out the cutlery and asked if they needed anything.

And now I’m apologising to a dog.

Fair enough.

Please forgive me. You are a good girl.

I am a fucking liability.`;

export const SHARED_ROUND_TABLE_SCRIPT =
  "Who was steering the investigation? And who suddenly became very interested in somebody else’s object? I’m looking at you, Jamie.\n\nThat isn’t evidence. I just think you need watching.\n\nTake your seats at the Round Table. Bring your suspicions, your flimsy theories, and the confidence of someone who’s got absolutely fuck all to back them up. The debate begins now.";

export const SHARED_VOTING_OPEN_SCRIPT =
  "Banishment — vote for a PERSON.\n\nThe time for polite chatter has officially evaporated. Cast your accusations in secret on your phones. Poppy, darling... follow your instincts. Unless they’re shit. Lock in your votes. Let’s ruin someone’s evening.";

export const SHARED_ALL_VOTES_LOCKED_SCRIPT =
  "Every single slate is locked in wax. Seven accusations sealed in cold blood. We shall now reveal your slates... one by one, in seating order.";

export const SHARED_BANISHMENT_REVEAL_SCRIPT =
  "The votes are in. The decision is final. One of you has just been banished by your own friends. Happy birthday, Libby. If you’ve received the most votes, please stand. Take a moment. Look around at the people who’ve done this to you. Some look terribly pleased with themselves. We’ll see how long that lasts. Before you leave, there is one thing we need to know. Are you a Faithful, or a Traitor?";

export const HOST_SCRIPTS: Record<number, HostDialogueSet> = {
  1: {
    intro:
      "Welcome to Jasmine’s Castle.\n\nSeven of you have arrived. All alive. Lovely. Let’s not get attached.\n\nWe’re celebrating Libby’s birthday, and nothing says friendship quite like Murder, Merlot and Manipulation.\n\nYour allegiance changes each round. Your points stay with you. But to win, you must survive the final banishments. A surviving Traitor steals the victory. Otherwise, the highest-scoring Faithful still standing takes the crown.\n\nNow. Phones out. Secrets to yourselves.\n\nLet’s make this uncomfortable.",
    roleBriefing:
      "Round One. Look down at your phones. Shield your glass screens. One Traitor has been chosen; six of you are Faithful. Traitor... memorise your secret assignment. Faithful... observe every nervous gulp. When you are ready, lock away your screens.",
    missionStart:
      "The lord of the castle is dead. Seven objects were recovered from the scene. One of them is going in the evidence bag. Unfortunately, our entire forensic department is you.\n\nOne object was planted by the Traitor. Their assignment is to persuade you to choose it as Exhibit A. You know what they’re trying to do. You don’t know which object they need you to choose.",
    roundTable: SHARED_ROUND_TABLE_SCRIPT,
    votingOpen: SHARED_VOTING_OPEN_SCRIPT,
    allVotesLocked: SHARED_ALL_VOTES_LOCKED_SCRIPT,
    phoneSlateTurn: (playerName: string) =>
      `${playerName}... darling, lift your slate high. Turn your phone toward the room and tell us who you want to destroy.`,
    voteConfirmedSlate: (voterName: string, targetName: string) =>
      `${voterName} has accused ${targetName}! Oh, the betrayal. The drama is delicious.`,
    banishment: (_targetName: string, _isTraitor: boolean) => SHARED_BANISHMENT_REVEAL_SCRIPT,
    tieOccurred: (names: string[]) =>
      `A deadlock! An exact tie between ${names.join(' and ')}. You each have sixty seconds to plead for your lives before a revote.`,
    tieBanishmentFailed:
      "A second tie! By castle decree, nobody is banished tonight. The Traitor survives to laugh another day.",
    assignmentReveal: (traitorName: string, _objectiveTitle: string) =>
      `Now for the twist. ${traitorName} was the Traitor! Did their planted object become Exhibit A? Let us look at the evidence.`,
    roundSummary: (roundNum: number, _winnerTeam: string) =>
      `End of Round ${roundNum}! The scoreboard is updated. Remember... in round two, roles are completely reshuffled.`,
    finalResults: (winnerName: string) =>
      `All six rounds complete! Our Grand Champion is ${winnerName}!`,
  },
  2: {
    intro:
      "Round Two, my darlings. Fresh cloaks have been dealt in the dark. The previous Traitor might now be as innocent as a newborn lamb... or, they might be holding the poisoned chalice again. Trust nobody.",
    roleBriefing:
      "Shield your devices. One Traitor. Six Faithful. Absorb your role in silence... in silence, Gemma.",
    missionStart:
      "Mission Two: The Birthday Majority! Five delightfully indiscreet questions about everyone in this room. You will all secretly answer who is most likely to do what, then try to predict the group's consensus. Chris has been very quiet. I suspect he's been saving his opinions for a format where nobody can interrupt. Honesty is optional; accuracy is rewarded.",
    roundTable:
      "Back to the Round Table. Who threw who under the bus in the majority voting? Probably Poppy. Who tried to steer the predictions away from the truth? Probably Poppy. Defend yourself, Poppy.",
    votingOpen: SHARED_VOTING_OPEN_SCRIPT,
    allVotesLocked: SHARED_ALL_VOTES_LOCKED_SCRIPT,
    phoneSlateTurn: (playerName: string) =>
      `${playerName}... raise your slate to the table. Speak your mind. Do not hold back.`,
    voteConfirmedSlate: (voterName: string, targetName: string) =>
      `${voterName} points the finger directly at ${targetName}. Chills, literal chills.`,
    banishment: (_targetName: string, _isTraitor: boolean) => SHARED_BANISHMENT_REVEAL_SCRIPT,
    tieOccurred: (names: string[]) =>
      `We have an exact tie between ${names.join(' and ')}. Sixty seconds on the clock to save yourselves. Go!`,
    tieBanishmentFailed:
      "Still tied! Nobody leaves tonight. The Traitor has survived another trial.",
    assignmentReveal: (traitorName: string, objectiveTitle: string) =>
      `In Round Two, ${traitorName}’s secret objective was '${objectiveTitle}'. Did they succeed?`,
    roundSummary: (roundNum: number, _winnerTeam: string) =>
      `Round ${roundNum} is complete. Let us inspect the leaderboard of shame and glory.`,
    finalResults: (winnerName: string) =>
      `All six rounds complete! Our Grand Champion is ${winnerName}!`,
  },
  3: {
    intro:
      "Round Three, my loves! Paranoia has truly set in. The tea is cold, the glances are frosty. Six Faithful. One Traitor. I am wearing my fourth pair of woollen socks, and I can literally smell the betrayal in the air. Fresh lots have been drawn. Prepare yourselves.",
    roleBriefing:
      "Phones out. Look into the glowing screen. Memorise your identity. If you are the Traitor... do not let your eyebrows dance, Jamie. If you are Faithful... good luck, you're going to need it.",
    missionStart:
      "Mission Three: The Forgery Gallery! Pen and scrap paper ready. The Faithful have been given one secret drawing brief. The Traitor has been given something slightly... well, different. You will all sketch in deadly silence for two minutes, then reveal on my count.",
    roundTable:
      "Take your seats at the Round Table. Put the sketches down before the Louvre calls the police. One of you was drawing from a forged brief, and yet somehow all seven of your drawings look equally unhinged. Who hesitated before putting pen to paper? Who was peeking across the table to copy someone else's homework? And who is hiding pure treachery behind crimes against art? Interrogate the artists. The debate begins now.",
    votingOpen: SHARED_VOTING_OPEN_SCRIPT,
    allVotesLocked: SHARED_ALL_VOTES_LOCKED_SCRIPT,
    phoneSlateTurn: (playerName: string) =>
      `${playerName}... darling, show the room your slate. Who do you want out of the castle?`,
    voteConfirmedSlate: (voterName: string, targetName: string) =>
      `${voterName} accuses ${targetName}. Oh, the cruelty! I love it.`,
    banishment: (_targetName: string, _isTraitor: boolean) => SHARED_BANISHMENT_REVEAL_SCRIPT,
    tieOccurred: (names: string[]) =>
      `We have a deadlock between ${names.join(' and ')}. Revote required immediately!`,
    tieBanishmentFailed:
      "No banishment! The Traitor survives another trial. Unbelievable scenes.",
    assignmentReveal: (traitorName: string, objectiveTitle: string) =>
      `In The Forgery Gallery, ${traitorName}’s objective was '${objectiveTitle}'. Look at them! Did they pull it off?`,
    roundSummary: (roundNum: number, _winnerTeam: string) =>
      `Round ${roundNum} concludes. The standings are closer than my fringe to my eyebrows.`,
    finalResults: (winnerName: string) => `The castle is won! All hail ${winnerName}!`,
  },
  4: {
    intro:
      "Round Four, my darlings. More than halfway through Libby’s birthday, and the trust in this room is thinner than cheap prosecco. New roles are being dealt in the shadows. Yesterday’s Faithful could be tonight’s cold-blooded Traitor. Look at your friends. One of them is about to lie to your face.",
    roleBriefing:
      "Phones out, eyes down. Check your new allegiance in complete silence. One Traitor with a secret contraband agenda; six Faithful trying to keep it together. Lock your poker faces in place and put your phones away.",
    missionStart:
      "Mission Four: The Body Disposal Committee! A disaster during dessert — the Duchess is dead on the dining room rug, the Inspector is five minutes away, and your only getaway vehicle is a tandem bicycle. Gemma, I appreciate that we've sprung this on you, but I do need you to look slightly less prepared. You must choose exactly five household objects to pack and weave them into a coherent sixty-second escape story. Beware: the Traitor has been secretly ordered to smuggle one utterly ridiculous item into your final five.",
    roundTable:
      "Back to the Round Table. Well, that escape story was an absolute masterclass in panic. Now ask yourselves: who fought tooth and nail to pack a completely useless object onto that bicycle? Who hijacked the committee, and who quietly let someone else do their dirty work? The alibis are crumbling. Point your fingers — the debate begins now.",
    votingOpen: SHARED_VOTING_OPEN_SCRIPT,
    allVotesLocked: SHARED_ALL_VOTES_LOCKED_SCRIPT,
    phoneSlateTurn: (playerName: string) =>
      `${playerName}... present your slate to the group.`,
    voteConfirmedSlate: (voterName: string, targetName: string) =>
      `${voterName} casts their vote against ${targetName}.`,
    banishment: (_targetName: string, _isTraitor: boolean) => SHARED_BANISHMENT_REVEAL_SCRIPT,
    tieOccurred: (names: string[]) =>
      `Tied vote between ${names.join(' and ')}! Defend your lives!`,
    tieBanishmentFailed:
      "Tie unbroken. No banishment tonight. The Traitor smiles in the shadows.",
    assignmentReveal: (traitorName: string, objectiveTitle: string) =>
      `In Mission Four, ${traitorName} was tasked with '${objectiveTitle}'. Did they succeed?`,
    roundSummary: (roundNum: number, _winnerTeam: string) =>
      `End of Round ${roundNum}. Let's view the updated leaderboard.`,
    finalResults: (winnerName: string) => `The winner is ${winnerName}!`,
  },
  5: {
    intro:
      "Round Five! The penultimate chapter, and the paranoia is practically dripping down the castle walls. We are dangerously close to the Grand Finale. Fresh cloaks have been dealt one more time before the end. Nobody is safe, and nobody is above suspicion.",
    roleBriefing:
      "Shield your screens. Discover your Round Five identity. Faithful, you will receive three secret pass-words for the mission ahead. Traitor, you only get two — and you’ll have to bluff for your life. Memorise your brief in silence.",
    missionStart:
      "Mission Five: The Counterfeit Expert! You each have thirty seconds to pitch the exact same absurd invention to the room. Every Faithful has the same three mandatory keywords to slip naturally into their pitch. The Traitor only knows two of them and must listen closely to deduce and steal the third word. Speak clearly, watch who stumbles, and spot the imposter.",
    roundTable:
      "Take your seats at the Round Table. After those pitches, I wouldn't buy a toaster from any of you. Who sounded like they were making it up on the spot? Who was listening a little too hard to everyone else's keywords before taking their turn? And who slipped a stolen word in at the very last second? Tear those pitches apart. The debate begins now.",
    votingOpen: SHARED_VOTING_OPEN_SCRIPT,
    allVotesLocked: SHARED_ALL_VOTES_LOCKED_SCRIPT,
    phoneSlateTurn: (playerName: string) =>
      `${playerName}... lift your slate high and declare your suspect.`,
    voteConfirmedSlate: (voterName: string, targetName: string) =>
      `${voterName} points the finger at ${targetName}.`,
    banishment: (_targetName: string, _isTraitor: boolean) => SHARED_BANISHMENT_REVEAL_SCRIPT,
    tieOccurred: (names: string[]) => `Deadlock between ${names.join(' and ')}. Revote!`,
    tieBanishmentFailed: "No banishment! The Traitor survives to the grand finale.",
    assignmentReveal: (traitorName: string, objectiveTitle: string) =>
      `${traitorName} had to guess the missing word: '${objectiveTitle}'. Did they pull it off?`,
    roundSummary: (roundNum: number, _winnerTeam: string) =>
      `Round Five complete! Only one final round remains.`,
    finalResults: (winnerName: string) => `The champion is ${winnerName}!`,
  },
  6: {
    intro:
      "The Sixth and Final Round! The grand climax of Libby’s Birthday: Trust Nobody. One final Traitor has been chosen, and from this moment on, roles are locked until the bitter end. To claim the crown, you must survive the final banishments. If even one Traitor is left standing at the end, they steal the entire victory.",
    roleBriefing:
      "For the final time tonight, look down at your phones. The Traitor chosen right now stays the Traitor for the rest of the game. Absorb your final allegiance in dead silence. Make history tonight, my loves.",
    missionStart:
      "Mission Six: The Getaway Auction! You each have twelve gold coins to bid on six mystery escape lots. Sealed bids on your phones — highest bidder takes the lot and the points inside, while the Traitor is secretly trying to drain your wallets and sabotage the bidding. Spend wisely, bluff boldly, and watch who is driving up the price.",
    roundTable:
      "Welcome to the Final Round Table. The auction is over, your coins are spent, and the castle doors are bolted shut. From this moment on, if you are banished, you are out of the game for good. Look around this table: who manipulated the bidding, who has been playing the loyal friend all night, and who is sitting there in a Traitor's cloak waiting to steal Libby's birthday crown? Speak now, or lose everything.",
    votingOpen: SHARED_VOTING_OPEN_SCRIPT,
    allVotesLocked: SHARED_ALL_VOTES_LOCKED_SCRIPT,
    phoneSlateTurn: (playerName: string) =>
      `${playerName}... for the final time, raise your slate to the castle.`,
    voteConfirmedSlate: (voterName: string, targetName: string) =>
      `${voterName} delivers their accusation against ${targetName}.`,
    banishment: (_targetName: string, _isTraitor: boolean) => SHARED_BANISHMENT_REVEAL_SCRIPT,
    tieOccurred: (names: string[]) =>
      `A tie in the final hour between ${names.join(' and ')}! Defend yourselves!`,
    tieBanishmentFailed:
      "Tied revote! No banishment! Discussion must resume until an elimination is decided.",
    assignmentReveal: (traitorName: string, objectiveTitle: string) =>
      `The final Traitor was ${traitorName}. Their secret mission: '${objectiveTitle}'.`,
    roundSummary: (_roundNum: number, _winnerTeam: string) =>
      `The six rounds are concluded! It is time for the Grand Awards ceremony. Bring out the cake!`,
    finalResults: (winnerName: string) =>
      `What an evening of sheer theatrical drama, Scottish mist, and breathtaking deceit. Our Grand Champion is ${winnerName}! Happy Birthday Libby!`,
  },
};

export const ROUND_TABLE_PROMPTS = [
  "Look each other in the eye. Who changed the group's consensus during the mission?",
  "Who was suspiciously eager to volunteer or speak first?",
  "Who stayed completely silent while everyone else was arguing?",
  "Who deflected suspicion onto someone else the second a question was raised?",
  "Remember: The Traitor wants you to banish an innocent friend on Libby's birthday.",
  "Look into my fringe. What physical reaction did you notice when the mission timer was running down?",
  "Why is someone drinking their water with a trembling hand right now?",
];
