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

export const HOST_SCRIPTS: Record<number, HostDialogueSet> = {
  1: {
    intro:
      "Welcome to Jasmine’s Castle.\n\nSeven of you have arrived. All alive. Lovely. Let’s not get attached.\n\nWe’re celebrating Libby’s birthday, and nothing says friendship quite like Murder, Merlot and Manipulation.\n\nYour allegiance changes each round. Your points stay with you. But to win, you must survive the final banishments. A surviving Traitor steals the victory. Otherwise, the highest-scoring Faithful still standing takes the crown.\n\nNow. Phones out. Secrets to yourselves.\n\nLet’s make this uncomfortable.",
    roleBriefing:
      "Round One. Look down at your phones. Shield your glass screens. One Traitor has been chosen; six of you are Faithful. Traitor... memorise your secret assignment. Faithful... observe every nervous gulp. When you are ready, lock away your screens.",
    missionStart:
      "The lord of the castle is dead. Seven objects were recovered from the scene. One of them is going in the evidence bag. Unfortunately, our entire forensic department is you.\n\nOne object was planted by the Traitor. Their assignment is to persuade you to choose it as Exhibit A. You know what they’re trying to do. You don’t know which object they need you to choose.",
    roundTable:
      "Who was steering the investigation? Did anyone suddenly become very interested in somebody else’s object?\n\nTake your seats at the Round Table. The debate begins now.",
    votingOpen:
      "Banishment — vote for a PERSON.\n\nThe time for polite chatter has officially evaporated. Cast your accusations in secret on your phones.",
    allVotesLocked:
      "Every single slate is locked in wax. Seven accusations sealed in cold blood. We shall now reveal your slates... one by one, in seating order.",
    phoneSlateTurn: (playerName: string) =>
      `${playerName}... darling, lift your slate high. Turn your phone toward the room and tell us who you want to destroy.`,
    voteConfirmedSlate: (voterName: string, targetName: string) =>
      `${voterName} has accused ${targetName}! Oh, the betrayal. The drama is delicious.`,
    banishment: (targetName: string, isTraitor: boolean) =>
      isTraitor
        ? `The castle has spoken! ${targetName}... step into the circle of fire. Look into my eyes. You were... A TRAITOR! You caught them! Pure cinema!`
        : `The castle has spoken! ${targetName}... step into the circle. Look into my eyes... Oh no. You were... 100% FAITHFUL! You have banished an innocent friend on Libby's birthday! Shame on all of you!`,
    tieOccurred: (names: string[]) =>
      `A deadlock! An exact tie between ${names.join(' and ')}. You each have sixty seconds to plead for your lives before a revote.`,
    tieBanishmentFailed:
      "A second tie! By castle decree, nobody is banished tonight. The Traitor survives to laugh another day.",
    assignmentReveal: (traitorName: string, objectiveTitle: string) =>
      `Now for the twist. ${traitorName} was the Traitor! Did their planted object become Exhibit A? Let us look at the evidence.`,
    roundSummary: (roundNum: number, winnerTeam: string) =>
      `End of Round ${roundNum}! The scoreboard is updated. Remember... in round two, roles are completely reshuffled.`,
    finalResults: (winnerName: string) =>
      `All six rounds complete! Our Grand Champion is ${winnerName}!`,
  },
  2: {
    intro:
      "Round Two, my darlings. Fresh cloaks have been dealt in the dark. The previous Traitor might now be as innocent as a newborn lamb... or they might be holding the poisoned chalice again. Trust nobody.",
    roleBriefing:
      "Shield your devices. One Traitor. Six Faithful. Absorb your role in silence.",
    missionStart:
      "Mission Two: The Birthday Majority! Five delightfully indiscreet questions about everyone in this room. You will all secretly answer who is most likely to do what, then try to predict the group's consensus. Honesty is optional; accuracy is rewarded.",
    roundTable:
      "Back to the Round Table. Who threw who under the bus in the majority voting? Who tried to steer the predictions away from the truth? Defend yourselves.",
    votingOpen:
      "Banishment — vote for a PERSON. Slates ready, my loves. Pick your suspect and lock it in.",
    allVotesLocked:
      "Seven votes sealed in wax. The tension is magnificent. Let the slates turn.",
    phoneSlateTurn: (playerName: string) =>
      `${playerName}... raise your slate to the table. Speak your mind. Do not hold back.`,
    voteConfirmedSlate: (voterName: string, targetName: string) =>
      `${voterName} points the finger directly at ${targetName}. Chills, literal chills.`,
    banishment: (targetName: string, isTraitor: boolean) =>
      isTraitor
        ? `${targetName} has been banished! And they were... THE TRAITOR! Justice in the Highlands!`
        : `${targetName} has been banished! But oh, the heartbreak... they were completely FAITHFUL! Heartbreaking!`,
    tieOccurred: (names: string[]) =>
      `We have an exact tie between ${names.join(' and ')}. Sixty seconds on the clock to save yourselves. Go!`,
    tieBanishmentFailed:
      "Still tied! Nobody leaves tonight. The Traitor has survived another trial.",
    assignmentReveal: (traitorName: string, objectiveTitle: string) =>
      `In Round Two, ${traitorName}’s secret objective was '${objectiveTitle}'. Did they succeed?`,
    roundSummary: (roundNum: number, winnerTeam: string) =>
      `Round ${roundNum} is complete. Let us inspect the leaderboard of shame and glory.`,
    finalResults: (winnerName: string) =>
      `All six rounds complete! Our Grand Champion is ${winnerName}!`,
  },
  3: {
    intro:
      "Round Three, my loves! Paranoia has truly set in. The tea is cold, the glances are frosty. Six Faithful. One Traitor. I am wearing my fourth pair of woollen socks, and I can literally smell the betrayal in the air. Fresh lots have been drawn. Prepare yourselves.",
    roleBriefing:
      "Phones out. Look into the glowing screen. Memorise your identity. If you are the Traitor... do not let your eyebrows dance. If you are Faithful... good luck, you're going to need it.",
    missionStart:
      "Mission Three: The Forgery Gallery! Pen and scrap paper ready. The Faithful have been given one secret drawing brief. The Traitor has been given something slightly... well, different. You will all sketch in deadly silence for two minutes, then reveal on my count.",
    roundTable:
      "Gaze upon the sketches on the table. One of them looks like a fever dream. Who drew something suspiciously off-kilter? Who is defending their wonky artwork with their life? Attack!",
    votingOpen:
      "Banishment — vote for a PERSON. Slates ready, my darlings. Lock in your verdict on the forger. No remorse.",
    allVotesLocked: "Seven votes sealed in wax. Let the slates turn.",
    phoneSlateTurn: (playerName: string) =>
      `${playerName}... darling, show the room your slate. Who do you want out of the castle?`,
    voteConfirmedSlate: (voterName: string, targetName: string) =>
      `${voterName} accuses ${targetName}. Oh, the cruelty! I love it.`,
    banishment: (targetName: string, isTraitor: boolean) =>
      isTraitor
        ? `Caught red-handed! ${targetName} was indeed THE TRAITOR! High fives all round!`
        : `Disaster at the castle! ${targetName} was completely and utterly FAITHFUL! You monsters!`,
    tieOccurred: (names: string[]) =>
      `We have a deadlock between ${names.join(' and ')}. Revote required immediately!`,
    tieBanishmentFailed:
      "No banishment! The Traitor survives another trial. Unbelievable scenes.",
    assignmentReveal: (traitorName: string, objectiveTitle: string) =>
      `In The Forgery Gallery, ${traitorName}’s objective was '${objectiveTitle}'. Look at them! Did they pull it off?`,
    roundSummary: (roundNum: number, winnerTeam: string) =>
      `Round ${roundNum} concludes. The standings are closer than my fringe to my eyebrows.`,
    finalResults: (winnerName: string) => `The castle is won! All hail ${winnerName}!`,
  },
  4: {
    intro:
      "Round Four! More than halfway through the evening, and the friendships are fraying at the seams. The lots have been cast anew. One Traitor. Six Faithful. Steel yourselves.",
    roleBriefing: "Inspect your screens. Keep your poker face intact.",
    missionStart:
      "Mission Four: The Body Disposal Committee! A completely absurd storytelling crisis. The Duchess has died during dessert. The inspector is five minutes away, your getaway vehicle is a bicycle, and the police already know you're here. Together, pick five objects and tell an absurd story under sixty seconds!",
    roundTable:
      "The Round Table resumes. Who insisted on bringing that ridiculous household object? Who was steering the getaway narrative? Time to question everything.",
    votingOpen:
      "Banishment — vote for a PERSON. The slates are waiting. Point your finger of doom and lock it in.",
    allVotesLocked: "All seven votes locked in wax. Let the revelations begin.",
    phoneSlateTurn: (playerName: string) =>
      `${playerName}... present your slate to the group.`,
    voteConfirmedSlate: (voterName: string, targetName: string) =>
      `${voterName} casts their vote against ${targetName}.`,
    banishment: (targetName: string, isTraitor: boolean) =>
      isTraitor
        ? `${targetName} is banished! And yes... THE TRAITOR HAS BEEN CAUGHT!`
        : `${targetName} is banished... but they were completely FAITHFUL! Pure tragedy!`,
    tieOccurred: (names: string[]) =>
      `Tied vote between ${names.join(' and ')}! Defend your lives!`,
    tieBanishmentFailed:
      "Tie unbroken. No banishment tonight. The Traitor smiles in the shadows.",
    assignmentReveal: (traitorName: string, objectiveTitle: string) =>
      `In Mission Four, ${traitorName} was tasked with '${objectiveTitle}'. Did they succeed?`,
    roundSummary: (roundNum: number, winnerTeam: string) =>
      `End of Round ${roundNum}. Let's view the updated leaderboard.`,
    finalResults: (winnerName: string) => `The winner is ${winnerName}!`,
  },
  5: {
    intro:
      "Round Five! The penultimate chapter. Paranoia has reached boiling point. One Traitor walks among you with a velvet smirk. Six Faithful are desperate for points.",
    roleBriefing:
      "Look down at your screens. Memorise your identity and your secret briefing.",
    missionStart:
      "Mission Five: The Counterfeit Expert! Everyone must pitch the exact same ridiculous invention in thirty seconds. Faithful have three secret required words to smuggle into their pitch. The Traitor only has two words, and must infer the third! Listen closely to every pitch.",
    roundTable:
      "The pitches were magnificent, and deeply suspicious. Who used bizarre vocabulary? Who seemed completely lost? Time to vote.",
    votingOpen:
      "Banishment — vote for a PERSON. Slates ready. Lock in your accusations in secret.",
    allVotesLocked: "Seven slates locked in stone. The hour of reckoning has arrived.",
    phoneSlateTurn: (playerName: string) =>
      `${playerName}... lift your slate high and declare your suspect.`,
    voteConfirmedSlate: (voterName: string, targetName: string) =>
      `${voterName} points the finger at ${targetName}.`,
    banishment: (targetName: string, isTraitor: boolean) =>
      isTraitor
        ? `THE TRAITOR HAS BEEN UNMASKED! ${targetName} was the impostor!`
        : `Heartache! ${targetName} was 100% FAITHFUL! An innocent soul banished!`,
    tieOccurred: (names: string[]) => `Deadlock between ${names.join(' and ')}. Revote!`,
    tieBanishmentFailed: "No banishment! The Traitor survives to the grand finale.",
    assignmentReveal: (traitorName: string, objectiveTitle: string) =>
      `${traitorName} had to guess the missing word: '${objectiveTitle}'. Did they pull it off?`,
    roundSummary: (roundNum: number, winnerTeam: string) =>
      `Round Five complete! Only one final round remains.`,
    finalResults: (winnerName: string) => `The champion is ${winnerName}!`,
  },
  6: {
    intro:
      "The Sixth and Final Round! The grand climax of Libby’s Birthday: Trust Nobody. One last Traitor. Six final Faithful. Up to six decisive points remain. Everything is on the line.",
    roleBriefing:
      "The Traitor chosen for this round stays the Traitor until the game ends.\n\nLook down at your screens. Absorb your true allegiance. One Traitor. Six Faithful. Make history tonight, my loves.",
    missionStart:
      "Mission Six: The Getaway Auction! Everyone starts with twelve auction coins. Six fictional getaway lots will be auctioned in ascending value. Highest sealed bid wins the lot and pays their bid. Who will hoard the most escape points? Persuade, bluff, and bid wisely!",
    roundTable:
      "The auction is over. Your money has gone. Your Traitor hasn’t. From this moment, if you’re banished, you’re finished.",
    votingOpen:
      "Banishment — vote for a PERSON. Permanent elimination. Choose with utmost care.",
    allVotesLocked: "The final seven votes are sealed in wax. The slates of destiny await.",
    phoneSlateTurn: (playerName: string) =>
      `${playerName}... for the final time, raise your slate to the castle.`,
    voteConfirmedSlate: (voterName: string, targetName: string) =>
      `${voterName} delivers their accusation against ${targetName}.`,
    banishment: (targetName: string, isTraitor: boolean) =>
      `The circle has closed. ${targetName} has been permanently banished from Jasmine's Castle. Their role remains unknown.`,
    tieOccurred: (names: string[]) =>
      `A tie in the final hour between ${names.join(' and ')}! Defend yourselves!`,
    tieBanishmentFailed:
      "Tied revote! No banishment! Discussion must resume until an elimination is decided.",
    assignmentReveal: (traitorName: string, objectiveTitle: string) =>
      `The final Traitor was ${traitorName}. Their secret mission: '${objectiveTitle}'.`,
    roundSummary: (roundNum: number, winnerTeam: string) =>
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
