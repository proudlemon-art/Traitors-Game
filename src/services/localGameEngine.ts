import {
  GamePhase,
  GameState,
  ClientGameState,
  Player,
  SanitizedPlayer,
  RoundHistory,
  TraitorObjective,
  ExhibitAObject,
  PlayerScoreBreakdown,
} from '../types/game';
import {
  TRAITOR_OBJECTIVES,
  BIRTHDAY_MAJORITY_QUESTION_POOL,
  FORGERY_BRIEF_PAIRS,
  BODY_DISPOSAL_SCENARIO,
  BODY_DISPOSAL_OBJECTS_POOL,
  COUNTERFEIT_INVENTIONS,
  AUCTION_LOTS,
} from '../data/missions';
import { HOST_SCRIPTS } from '../data/dialogue';

export interface LocalRoomRecord {
  code: string;
  creatorToken: string;
  state: GameState;
  players: Record<string, Player>; // token -> Player
}

const STORAGE_PREFIX = 'traitors_local_room_';
const CHANNEL_NAME = 'traitors_castle_sync_channel';

function generateId(prefix: string = ''): string {
  return `${prefix}${Math.random().toString(36).substring(2, 9)}`;
}

function generateRoomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}

function getDefaultDialogue(phase: string, round: number): string {
  const roundScripts = HOST_SCRIPTS[round] || HOST_SCRIPTS[1];
  switch (phase) {
    case 'INTRO':
      return roundScripts.intro;
    case 'ROLE_BRIEFING':
      return roundScripts.roleBriefing;
    case 'MISSION':
      return roundScripts.missionStart;
    case 'ROUND_TABLE':
      return roundScripts.roundTable;
    case 'VOTING':
      return roundScripts.votingOpen;
    case 'VOTE_REVEALS':
      return roundScripts.allVotesLocked;
    default:
      return roundScripts.intro;
  }
}

export function createInitialGameState(roomCode: string, isDemo = false): GameState {
  const initialDuration = 480;
  return {
    roomCode,
    currentRound: 1,
    phase: 'LOBBY',
    phaseTimeRemaining: initialDuration,
    timerDurationSec: initialDuration,
    timerDeadline: Date.now() + initialDuration * 1000,
    isTimerPaused: false,
    timerPausedRemaining: undefined,
    totalGoldPot: 0,
    roundGold: 0,
    seatingOrder: [],
    currentRevealIndex: 0,
    tieCandidateIds: [],
    tieRevealIndex: 0,
    isTieRevote: false,
    traitorId: null,
    traitorName: null,
    traitorObjective: null,
    roundHistory: [],
    latestDialogue: HOST_SCRIPTS[1]?.intro || 'Welcome to Jasmine’s Castle. Trust absolutely nobody.',
    isDemoRoom: isDemo,
    exhibitAState: {
      stage: 'COLLECTION',
      objects: [],
      isListLocked: false,
      acknowledgedPlayerIds: [],
      evidenceVotes: {},
      isEvidenceVoteLocked: false,
      evidenceVoteRevealed: false,
      isEvidenceTieRevote: false,
      tiedObjectIds: [],
    },
  };
}

function setPhaseWithTimer(s: GameState, phase: GamePhase, durationSec: number, dialogue: string) {
  s.phase = phase;
  s.phaseTimeRemaining = durationSec;
  s.timerDurationSec = durationSec;
  s.timerDeadline = Date.now() + durationSec * 1000;
  s.isTimerPaused = false;
  s.timerPausedRemaining = undefined;
  s.latestDialogue = dialogue;
}

function recalculateMajorityResults(s: GameState, playersMap: Record<string, Player>) {
  if (!s.birthdayMajorityState) return;

  const bState = s.birthdayMajorityState;
  const initialAnswers = bState.initialAnswers || {};
  const questionResults: Record<number, { topNames: string[]; votesCount: Record<string, number> }> = {};
  const correctCounts: Record<string, number> = {};

  Object.values(playersMap).forEach(p => {
    correctCounts[p.id] = 0;
  });

  bState.questions.forEach(q => {
    const qId = q.id;
    const votesCount: Record<string, number> = {};

    Object.entries(initialAnswers).forEach(([_, answers]) => {
      const chosen = (answers as any)?.[qId] || (answers as any)?.[String(qId)];
      if (chosen) {
        votesCount[chosen] = (votesCount[chosen] || 0) + 1;
      }
    });

    let maxVotes = 0;
    let topNames: string[] = [];
    Object.entries(votesCount).forEach(([name, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        topNames = [name];
      } else if (count === maxVotes && maxVotes > 0) {
        topNames.push(name);
      }
    });

    questionResults[qId] = { topNames, votesCount };

    if (topNames.length > 0) {
      Object.entries(initialAnswers).forEach(([pId, answers]) => {
        const chosen = (answers as any)?.[qId] || (answers as any)?.[String(qId)];
        if (chosen && topNames.includes(chosen)) {
          correctCounts[pId] = Math.min(3, (correctCounts[pId] || 0) + 1);
        }
      });
    }
  });

  bState.questionResults = questionResults;
  bState.playerCorrectCount = correctCounts;

  if (bState.traitorTargetFaithfulId && bState.traitorAssignedQuestionId) {
    const targetAnswers = initialAnswers[bState.traitorTargetFaithfulId];
    const targetChoice =
      (targetAnswers as any)?.[bState.traitorAssignedQuestionId] ||
      (targetAnswers as any)?.[String(bState.traitorAssignedQuestionId)];
    const qResult = questionResults[bState.traitorAssignedQuestionId];
    if (targetChoice && qResult && qResult.topNames.length > 0) {
      bState.traitorAssignmentSuccess = !qResult.topNames.includes(targetChoice);
    }
  }
}

function assignSecretRoles(s: GameState, playersMap: Record<string, Player>) {
  const players = Object.values(playersMap);
  if (players.length === 0) return;

  const traitorIndex = Math.floor(Math.random() * players.length);
  const traitorPlayer = players[traitorIndex];
  const roundNum = s.currentRound;
  const objective: TraitorObjective = TRAITOR_OBJECTIVES[roundNum] || TRAITOR_OBJECTIVES[1];

  players.forEach((p, idx) => {
    if (idx === traitorIndex) {
      p.role = 'TRAITOR';
      if (roundNum === 1) {
        p.secretMission =
          'You are the Traitor. Everyone will bring an object to the table, including you. Once all seven contenders are submitted, the app will secretly tell you which object you planted. Your job will be to get that object chosen as Exhibit A. For now, bring an ordinary object and act innocent.';
      } else {
        p.secretMission = `${objective.title}: ${objective.description} Goal: ${objective.conversationalGoal}`;
      }
    } else {
      p.role = 'FAITHFUL';
      p.secretMission = undefined;
    }
    p.hasLockedVote = false;
    p.hasRevealedSlate = false;
    p.votedForPlayerId = undefined;
    p.votedForPlayerName = undefined;
  });

  s.traitorId = traitorPlayer.id;
  s.traitorName = traitorPlayer.name;
  s.traitorObjective = objective;
  s.currentRevealIndex = 0;
  s.isTieRevote = false;
  s.tieCandidateIds = [];

  if (roundNum === 1) {
    const existingObjects =
      s.exhibitAState?.objects && s.exhibitAState.objects.length > 0 ? s.exhibitAState.objects : [];
    s.exhibitAState = {
      stage: 'COLLECTION',
      objects: existingObjects,
      plantedObjectId: undefined,
      plantedObjectName: undefined,
      isListLocked: false,
      acknowledgedPlayerIds: [],
      evidenceVotes: {},
      isEvidenceVoteLocked: false,
      evidenceVoteRevealed: false,
      isEvidenceTieRevote: false,
      tiedObjectIds: [],
    };
  } else if (roundNum === 2) {
    const faithfulList = players.filter(p => p.id !== traitorPlayer.id);
    const targetFaithful =
      faithfulList.length > 0 ? faithfulList[Math.floor(Math.random() * faithfulList.length)] : undefined;
    const assignedQ = BIRTHDAY_MAJORITY_QUESTION_POOL[0];

    s.birthdayMajorityState = {
      questions: BIRTHDAY_MAJORITY_QUESTION_POOL.slice(0, 5),
      step: 'INITIAL_ANSWERS',
      activeQuestionIndex: 0,
      initialAnswers: {},
      allInitialAnswersLocked: false,
      predictions: {},
      playerCorrectCount: {},
      traitorTargetFaithfulId: targetFaithful?.id,
      traitorTargetFaithfulName: targetFaithful?.name,
      traitorAssignedQuestionId: assignedQ?.id || 1,
      traitorAssignmentSuccess: false,
    };

    if (traitorPlayer && targetFaithful) {
      traitorPlayer.secretMission = `The Deliberate Detour: Your secret target Faithful is "${targetFaithful.name}". On Question ${assignedQ?.id || 1}, convince them to vote for someone other than the room's majority consensus!`;
    }
  } else if (roundNum === 3) {
    const pair = FORGERY_BRIEF_PAIRS[(roundNum - 1) % FORGERY_BRIEF_PAIRS.length];
    s.forgeryGalleryState = {
      faithfulBrief: pair.faithful,
      traitorBrief: pair.traitor,
      qualifiedMilestones: {},
      isDrawingLocked: false,
    };
  } else if (roundNum === 4) {
    s.bodyDisposalState = {
      scenario: BODY_DISPOSAL_SCENARIO,
      confirmedHouseholdItems: BODY_DISPOSAL_OBJECTS_POOL.slice(0, 7),
      traitorAssignedObject: BODY_DISPOSAL_OBJECTS_POOL[0],
      chosenFiveObjects: [],
      milestones: {
        fiveObjectsChosen: false,
        allFiveInStory: false,
        presentationUnderOneMinute: false,
      },
    };
  } else if (roundNum === 5) {
    const inv = COUNTERFEIT_INVENTIONS[(roundNum - 1) % COUNTERFEIT_INVENTIONS.length];
    s.counterfeitExpertState = {
      invention: inv.invention,
      faithfulThreeWords: inv.faithfulThreeWords,
      traitorTwoWords: inv.traitorTwoWords,
      missingThirdWord: inv.missingThirdWord,
      speakingOrder: s.seatingOrder,
      playerMilestones: {},
    };
  } else if (roundNum === 6) {
    const coinBalances: Record<string, number> = {};
    players.forEach(p => {
      coinBalances[p.id] = 12;
    });
    s.getawayAuctionState = {
      currentLotIndex: 0,
      lots: AUCTION_LOTS,
      playerCoins: coinBalances,
      playerEscapePoints: {},
      purchasedLots: {},
      bids: {},
      activeLotBidsLocked: false,
      tieRebidActive: false,
      tieCandidateIds: [],
      tieRebids: {},
      lotWinners: {},
    };
    s.finaleState = {
      stage: 'AUCTION_RECAP',
      cycleNumber: 1,
      eliminationCount: 0,
      eliminatedPlayerIds: [],
      firstBanishmentVotes: {},
      endOrBanishChoices: {},
      endOrBanishRevealed: false,
      revealedSurvivorIds: [],
      currentSurvivorRevealIndex: 0,
      allSurvivorsRevealed: false,
    };
  }
}

function recordRoundOutcome(
  s: GameState,
  playersMap: Record<string, Player>,
  banishedId: string | null,
  wasTraitor: boolean
) {
  if (s.roundHistory.some(h => h.roundNumber === s.currentRound)) {
    return;
  }

  const players = Object.values(playersMap);
  const traitor = players.find(p => p.id === s.traitorId);
  const banished = banishedId ? players.find(p => p.id === banishedId) : null;
  const roundScores: Record<string, number> = {};
  const scoreBreakdown: Record<string, PlayerScoreBreakdown> = {};
  const firstBallotVotes: Record<string, string> = {};

  let traitorAssignmentCompleted = false;

  if (s.currentRound === 1 && s.exhibitAState) {
    traitorAssignmentCompleted =
      !!s.exhibitAState.plantedObjectId &&
      s.exhibitAState.plantedObjectId === s.exhibitAState.winningObjectId;
  } else if (s.currentRound === 2 && s.birthdayMajorityState) {
    traitorAssignmentCompleted = !!s.birthdayMajorityState.traitorAssignmentSuccess;
  } else if (s.currentRound === 4 && s.bodyDisposalState) {
    traitorAssignmentCompleted = s.bodyDisposalState.chosenFiveObjects.includes(
      s.bodyDisposalState.traitorAssignedObject
    );
  } else if (s.currentRound === 5 && s.counterfeitExpertState) {
    traitorAssignmentCompleted = !!s.counterfeitExpertState.traitorGuessedWordSuccess;
  } else if (s.currentRound === 6 && s.getawayAuctionState) {
    traitorAssignmentCompleted = !!s.getawayAuctionState.traitorAssignmentSuccess;
  }

  players.forEach(p => {
    if (p.votedForPlayerId) {
      firstBallotVotes[p.id] = p.votedForPlayerId;
    }

    let missionPoints = 0;
    if (s.currentRound === 1 && s.exhibitAState) {
      const obj = s.exhibitAState.objects.find(o => o.contributorId === p.id);
      if (obj?.hasPresented) missionPoints += 1;
      if (s.exhibitAState.evidenceVotes[p.id]) missionPoints += 1;
      if (s.exhibitAState.evidenceVotes[p.id] === s.exhibitAState.winningObjectId) {
        missionPoints += 1;
      }
    } else if (s.currentRound === 2 && s.birthdayMajorityState) {
      missionPoints = Math.min(3, s.birthdayMajorityState.playerCorrectCount?.[p.id] || 0);
    } else if (s.currentRound === 3 && s.forgeryGalleryState) {
      const ms = s.forgeryGalleryState.qualifiedMilestones?.[p.id];
      missionPoints = (ms?.person ? 1 : 0) + (ms?.setting ? 1 : 0) + (ms?.threeObjects ? 1 : 0);
    } else if (s.currentRound === 4 && s.bodyDisposalState) {
      const ms = s.bodyDisposalState.milestones;
      missionPoints =
        (ms?.fiveObjectsChosen ? 1 : 0) +
        (ms?.allFiveInStory ? 1 : 0) +
        (ms?.presentationUnderOneMinute ? 1 : 0);
    } else if (s.currentRound === 5 && s.counterfeitExpertState) {
      const ms = s.counterfeitExpertState.playerMilestones?.[p.id];
      missionPoints =
        (ms?.under30Seconds ? 1 : 0) + (ms?.word1Used ? 1 : 0) + (ms?.word2Used ? 1 : 0);
    } else if (s.currentRound === 6 && s.getawayAuctionState) {
      const esc = s.getawayAuctionState.playerEscapePoints?.[p.id] || 0;
      missionPoints = Math.min(3, Math.max(0, Math.floor(esc / 2)));
    }
    missionPoints = Math.min(3, Math.max(0, missionPoints));

    let personalObjectivePoints = 0;
    if (p.role === 'FAITHFUL') {
      if (p.votedForPlayerId === s.traitorId) {
        personalObjectivePoints = 2;
      }
    } else if (p.role === 'TRAITOR') {
      if (traitorAssignmentCompleted) {
        personalObjectivePoints = 2;
      }
    }

    let roundOutcomePoints = 0;
    if (p.role === 'FAITHFUL') {
      if (wasTraitor) {
        roundOutcomePoints = 1;
      }
    } else if (p.role === 'TRAITOR') {
      if (!wasTraitor) {
        roundOutcomePoints = 1;
      }
    }

    const totalRoundPoints = missionPoints + personalObjectivePoints + roundOutcomePoints;

    p.score += totalRoundPoints;
    p.lastRoundScore = totalRoundPoints;
    roundScores[p.id] = totalRoundPoints;
    scoreBreakdown[p.id] = {
      missionPoints,
      personalObjectivePoints,
      roundOutcomePoints,
      totalRoundPoints,
    };
  });

  const history: RoundHistory = {
    roundNumber: s.currentRound,
    traitorId: s.traitorId || '',
    traitorName: traitor?.name || 'Unknown',
    banishedPlayerId: banishedId,
    banishedPlayerName: banished?.name || null,
    wasTraitorBanished: wasTraitor,
    traitorAssignmentCompleted,
    firstBallotVotes,
    scoreBreakdown,
    roundScores,
    exhibitAPlantedObjectName: s.exhibitAState?.plantedObjectName,
    exhibitAWon: s.exhibitAState?.winningObjectId === s.exhibitAState?.plantedObjectId,
  };

  s.roundHistory.push(history);
}

export function sanitizeLocalState(
  s: GameState,
  playersMap: Record<string, Player>,
  callingToken?: string,
  isHostDisplay = false
): ClientGameState {
  const callingPlayer = callingToken
    ? playersMap[callingToken] || Object.values(playersMap).find(p => p.id === callingToken)
    : undefined;

  let remainingSec = s.phaseTimeRemaining;
  if (s.isTimerPaused && s.timerPausedRemaining !== undefined) {
    remainingSec = Math.max(0, Math.round(s.timerPausedRemaining / 1000));
  } else if (s.timerDeadline) {
    remainingSec = Math.max(0, Math.ceil((s.timerDeadline - Date.now()) / 1000));
  }
  s.phaseTimeRemaining = remainingSec;

  const isRound1to5PostBanishment = [
    'BANISHMENT_OUTCOME',
    'ASSIGNMENT_VERIFICATION',
    'ROUND_SUMMARY',
  ].includes(s.phase);
  const isFinalResultsRevealed = s.phase === 'FINAL_RESULTS';

  const sanitizedPlayers: SanitizedPlayer[] = Object.values(playersMap).map(p => {
    const canRevealThisPlayerRole =
      (isRound1to5PostBanishment && s.currentRound < 6) ||
      isFinalResultsRevealed ||
      (s.phase === 'FINALE_FINAL_REVEAL' && s.finaleState?.revealedSurvivorIds.includes(p.id));

    return {
      id: p.id,
      name: p.name,
      seatNumber: p.seatNumber,
      connected: p.connected,
      score: p.score,
      lastRoundScore: p.lastRoundScore,
      isRoomCreator: !!p.isRoomCreator,
      hasLockedVote: !!p.hasLockedVote,
      hasRevealedSlate: !!p.hasRevealedSlate,
      revealedVoteForId: p.hasRevealedSlate ? p.votedForPlayerId : undefined,
      revealedVoteForName: p.hasRevealedSlate ? p.votedForPlayerName : undefined,
      revealedRole: canRevealThisPlayerRole ? p.role : undefined,
      isEliminated: !!p.isEliminated,
      survivedFinale: !!p.survivedFinale,
    };
  });

  const activeSeatOrder =
    s.currentRound === 6 && s.finaleState
      ? s.seatingOrder.filter(id => {
          const pl = Object.values(playersMap).find(p => p.id === id);
          return !pl?.isEliminated;
        })
      : s.seatingOrder;

  const currentRevealerId = activeSeatOrder[s.currentRevealIndex];
  const isMyTurnToReveal =
    (s.phase === 'VOTE_REVEALS' || s.phase === 'TIE_REVEALS' || s.phase === 'FINALE_VOTE_REVEALS') &&
    callingPlayer?.id === currentRevealerId;

  const clientState: ClientGameState = {
    roomCode: s.roomCode,
    currentRound: s.currentRound,
    phase: s.phase,
    phaseTimeRemaining: remainingSec,
    timerDurationSec: s.timerDurationSec,
    timerDeadline: s.timerDeadline,
    isTimerPaused: s.isTimerPaused,
    totalGoldPot: s.totalGoldPot,
    roundGold: s.roundGold,
    seatingOrder: s.seatingOrder,
    currentRevealIndex: s.currentRevealIndex,
    tieCandidateIds: s.tieCandidateIds,
    tieRevealIndex: s.tieRevealIndex,
    isTieRevote: s.isTieRevote,
    players: sanitizedPlayers,
    roundHistory: s.roundHistory,
    latestDialogue: s.latestDialogue,
    isDemoRoom: s.isDemoRoom,
    traitorId: s.isDemoRoom || isHostDisplay ? s.traitorId : undefined,
    traitorName: s.isDemoRoom || isHostDisplay ? s.traitorName : undefined,
  };

  if (callingPlayer) {
    clientState.myPlayerId = callingPlayer.id;
    clientState.myRole = callingPlayer.role;
    clientState.myHasLockedVote = callingPlayer.hasLockedVote;
    clientState.myHasRevealedSlate = callingPlayer.hasRevealedSlate;
    clientState.myVotedForId = callingPlayer.votedForPlayerId;
    clientState.isMyTurnToReveal = isMyTurnToReveal;
    clientState.isMyEliminated = !!callingPlayer.isEliminated;

    let resolvedPlantedObjectId = s.exhibitAState?.plantedObjectId;
    let resolvedPlantedObjectName = s.exhibitAState?.plantedObjectName;

    if (s.exhibitAState) {
      if (resolvedPlantedObjectId && !resolvedPlantedObjectName) {
        const match = s.exhibitAState.objects.find(o => o.id === resolvedPlantedObjectId);
        if (match?.name) resolvedPlantedObjectName = match.name;
      }
      if (
        !resolvedPlantedObjectName &&
        s.exhibitAState.stage !== 'COLLECTION' &&
        s.exhibitAState.objects.length > 0
      ) {
        const nonTraitor = s.exhibitAState.objects.filter(
          o => o.contributorId !== s.traitorId && o.name && o.name.trim().length > 0
        );
        const chosen = nonTraitor.length > 0 ? nonTraitor[0] : s.exhibitAState.objects[0];
        if (chosen) {
          resolvedPlantedObjectId = chosen.id;
          resolvedPlantedObjectName = chosen.name;
          s.exhibitAState.plantedObjectId = chosen.id;
          s.exhibitAState.plantedObjectName = chosen.name;
        }
      }
    }

    if (callingPlayer.role === 'TRAITOR') {
      clientState.mySecretMission = callingPlayer.secretMission;
      if (s.currentRound === 1) {
        if (resolvedPlantedObjectName && s.exhibitAState?.stage !== 'COLLECTION') {
          clientState.mySecretBriefing = `You are the Traitor. Your planted evidence is: "${resolvedPlantedObjectName}". Your secret mission is to convince the group to choose "${resolvedPlantedObjectName}" as Exhibit A without revealing your identity!`;
          clientState.mySecretMission = `Your planted evidence is: "${resolvedPlantedObjectName}". Get this object chosen as Exhibit A.`;
        } else {
          clientState.mySecretBriefing =
            'You are the Traitor. Everyone will bring an object to the table, including you. Once all contenders are submitted and locked, the app will secretly tell you which object you planted. Your job will be to get that object chosen as Exhibit A. For now, bring an ordinary object and act innocent.';
        }
      } else if (s.currentRound === 2) {
        const targetName = s.birthdayMajorityState?.traitorTargetFaithfulName || 'a Faithful';
        const qNum = s.birthdayMajorityState?.traitorAssignedQuestionId || 1;
        clientState.mySecretBriefing = `You are THE TRAITOR for Round 2. The castle plays The Birthday Majority. Your secret target is "${targetName}". During discussion, casually steer them so they pick an answer on Question ${qNum} that is NOT the room's majority consensus!`;
      } else if (s.currentRound === 6) {
        clientState.mySecretBriefing =
          'The Traitor chosen for this round stays the Traitor until the game ends. Maintain your composure through the auction and survive the final banishments to steal victory outright.';
      } else {
        clientState.mySecretBriefing = `You are THE TRAITOR for Round ${s.currentRound}. The castle is yours to deceive. Maintain your composure and fulfill your secret assignment.`;
      }
    } else if (callingPlayer.role === 'FAITHFUL') {
      if (s.currentRound === 1) {
        clientState.mySecretBriefing =
          'Bring one ordinary household object to the table and register it on your phone. Once everyone has submitted, the Traitor will secretly receive the object they must persuade you to choose as Exhibit A. Watch who tries to steer the investigation.';
      } else if (s.currentRound === 2) {
        clientState.mySecretBriefing =
          'You are FAITHFUL for Round 2. Sworn to protect Libby’s birthday honour! For each question, vote for the guest who genuinely fits best. Earn +1 pt for each question where you match the room’s majority consensus (up to 3 pts)! Beware of anyone trying to persuade you away from your gut.';
      } else if (s.currentRound === 6) {
        clientState.mySecretBriefing =
          'You are FAITHFUL for Round 6 and the Grand Finale. From this moment, if you are banished, you are permanently eliminated. Stay alert and banish the Traitor.';
      } else {
        clientState.mySecretBriefing = `You are FAITHFUL for Round ${s.currentRound}. Sworn to protect Libby's birthday honour! One player among you is lying. Watch who deflects and who steers the group.`;
      }
    }
  }

  if (isRound1to5PostBanishment || isFinalResultsRevealed) {
    clientState.revealedTraitorId = s.traitorId || undefined;
    clientState.revealedTraitorName = s.traitorName || undefined;
    clientState.revealedTraitorObjective = s.traitorObjective || undefined;
    if (s.exhibitAState?.plantedObjectName) {
      clientState.revealedPlantedObjectName = s.exhibitAState.plantedObjectName;
    }
  }

  if (s.exhibitAState) {
    const isTraitor = callingPlayer?.id === s.traitorId;
    const isRevealed = isRound1to5PostBanishment || s.currentRound > 1;

    const finalPlantedId =
      s.exhibitAState.plantedObjectId ||
      (s.exhibitAState.stage !== 'COLLECTION' ? s.exhibitAState.objects[0]?.id : undefined);
    const finalPlantedName =
      s.exhibitAState.plantedObjectName ||
      (finalPlantedId ? s.exhibitAState.objects.find(o => o.id === finalPlantedId)?.name : undefined);

    clientState.exhibitAState = {
      ...s.exhibitAState,
      plantedObjectId: isTraitor || isRevealed ? finalPlantedId : undefined,
      plantedObjectName: isTraitor || isRevealed ? finalPlantedName : undefined,
    };
  }

  if (s.birthdayMajorityState) clientState.birthdayMajorityState = s.birthdayMajorityState;
  if (s.forgeryGalleryState) clientState.forgeryGalleryState = s.forgeryGalleryState;
  if (s.bodyDisposalState) clientState.bodyDisposalState = s.bodyDisposalState;
  if (s.counterfeitExpertState) clientState.counterfeitExpertState = s.counterfeitExpertState;
  if (s.getawayAuctionState) clientState.getawayAuctionState = s.getawayAuctionState;
  if (s.finaleState) clientState.finaleState = s.finaleState;

  return clientState;
}

class LocalGameEngine {
  private memoryRooms: Map<string, LocalRoomRecord> = new Map();
  private channel: BroadcastChannel | null = null;
  private onExternalUpdate: ((roomCode: string) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = event => {
          if (event.data?.type === 'ROOM_UPDATED' && event.data?.roomCode) {
            this.loadRoomFromStorage(event.data.roomCode);
            if (this.onExternalUpdate) {
              this.onExternalUpdate(event.data.roomCode);
            }
          }
        };
      } catch {
        // BroadcastChannel not supported
      }
    }
  }

  public setExternalUpdateListener(cb: (roomCode: string) => void) {
    this.onExternalUpdate = cb;
  }

  private loadRoomFromStorage(code: string): LocalRoomRecord | null {
    const normalized = code.toUpperCase();
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${normalized}`);
        if (raw) {
          const parsed = JSON.parse(raw) as LocalRoomRecord;
          this.memoryRooms.set(normalized, parsed);
          return parsed;
        }
      } catch {
        // ignore storage errors
      }
    }
    return this.memoryRooms.get(normalized) || null;
  }

  public getRoom(code: string): LocalRoomRecord | null {
    const normalized = code.toUpperCase();
    if (this.memoryRooms.has(normalized)) {
      return this.memoryRooms.get(normalized)!;
    }
    const stored = this.loadRoomFromStorage(normalized);
    if (stored) return stored;
    if (normalized === 'DEMO7') {
      return this.setupDemoRoomRecord();
    }
    return null;
  }

  public saveRoom(record: LocalRoomRecord, broadcast = true) {
    const normalized = record.code.toUpperCase();
    this.memoryRooms.set(normalized, record);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${normalized}`, JSON.stringify(record));
      } catch {
        // ignore quota errors
      }
    }
    if (broadcast && this.channel) {
      try {
        this.channel.postMessage({ type: 'ROOM_UPDATED', roomCode: normalized });
      } catch {
        // ignore
      }
    }
  }

  public createRoom(hostName: string) {
    const cleanName = (hostName || 'Libby').trim() || 'Libby';
    const code = generateRoomCode();
    const playerToken = generateId('token_');
    const playerId = generateId('p_');

    const creatorPlayer: Player = {
      id: playerId,
      name: cleanName,
      isRoomCreator: true,
      seatNumber: 1,
      connected: true,
      score: 0,
    };

    const state = createInitialGameState(code, false);
    state.seatingOrder = [playerId];

    const record: LocalRoomRecord = {
      code,
      creatorToken: playerToken,
      state,
      players: {
        [playerToken]: creatorPlayer,
      },
    };

    this.saveRoom(record);

    return {
      roomCode: code,
      playerToken,
      playerId,
      name: cleanName,
      seatNumber: 1,
      isRoomCreator: true,
      state: sanitizeLocalState(record.state, record.players, playerToken, true),
    };
  }

  public joinRoom(roomCode: string, name: string, existingToken?: string) {
    const code = roomCode.toUpperCase();
    let room = this.getRoom(code);
    if (!room) {
      // If joining a room code on a fresh client, initialize room shell so join never fails offline
      const creatorToken = generateId('token_host_');
      const hostId = generateId('p_host_');
      const state = createInitialGameState(code, false);
      state.seatingOrder = [hostId];
      room = {
        code,
        creatorToken,
        state,
        players: {
          [creatorToken]: {
            id: hostId,
            name: 'Libby',
            isRoomCreator: true,
            seatNumber: 1,
            connected: true,
            score: 0,
          },
        },
      };
    }

    if (existingToken && room.players[existingToken]) {
      const existingPlayer = room.players[existingToken];
      existingPlayer.connected = true;
      this.saveRoom(room);
      return {
        roomCode: code,
        playerToken: existingToken,
        playerId: existingPlayer.id,
        name: existingPlayer.name,
        seatNumber: existingPlayer.seatNumber,
        isRoomCreator: !!existingPlayer.isRoomCreator,
        state: sanitizeLocalState(room.state, room.players, existingToken, !!existingPlayer.isRoomCreator),
      };
    }

    const playersList = Object.values(room.players);

    let cleanName = (name || '').trim() || `Guest ${playersList.length + 1}`;
    const existingNames = playersList.map(p => p.name.toLowerCase());
    if (existingNames.includes(cleanName.toLowerCase())) {
      let suffix = 2;
      while (existingNames.includes(`${cleanName.toLowerCase()} ${suffix}`)) {
        suffix++;
      }
      cleanName = `${cleanName} ${suffix}`;
    }

    const newToken = generateId('token_');
    const newPlayerId = generateId('p_');
    const seatNumber = playersList.length + 1;

    const newPlayer: Player = {
      id: newPlayerId,
      name: cleanName,
      isRoomCreator: false,
      seatNumber,
      connected: true,
      score: 0,
      role: room.state.phase !== 'LOBBY' ? 'FAITHFUL' : undefined,
    };

    room.players[newToken] = newPlayer;
    if (!room.state.seatingOrder.includes(newPlayerId)) {
      room.state.seatingOrder.push(newPlayerId);
    }
    if (room.state.getawayAuctionState) {
      room.state.getawayAuctionState.playerCoins[newPlayerId] = 12;
    }

    this.saveRoom(room);

    return {
      roomCode: code,
      playerToken: newToken,
      playerId: newPlayerId,
      name: cleanName,
      seatNumber,
      isRoomCreator: false,
      state: sanitizeLocalState(room.state, room.players, newToken, false),
    };
  }

  public setupDemoRoomRecord(): LocalRoomRecord {
    const code = 'DEMO7';
    const creatorToken = 'demo_token_libby';
    const state = createInitialGameState(code, true);

    const players: Record<string, Player> = {};
    const demoGuestList = [
      { name: 'Libby', isCreator: true, token: 'demo_token_libby', defaultObject: 'Antique Pocket Watch' },
      { name: 'Arthur', isCreator: false, token: 'demo_token_arthur', defaultObject: 'Black Leather Glove' },
      { name: 'Beatrice', isCreator: false, token: 'demo_token_beatrice', defaultObject: 'Crimson Handkerchief' },
      { name: 'Callum', isCreator: false, token: 'demo_token_callum', defaultObject: 'Ornate Brass Key' },
      { name: 'Daphne', isCreator: false, token: 'demo_token_daphne', defaultObject: 'Poison Decanter Flask' },
      { name: 'Edgar', isCreator: false, token: 'demo_token_edgar', defaultObject: 'Wax-Sealed Letter' },
      { name: 'Fiona', isCreator: false, token: 'demo_token_fiona', defaultObject: 'Engraved Silver Spoon' },
    ];

    state.seatingOrder = [];
    const demoObjects: ExhibitAObject[] = [];

    demoGuestList.forEach((guest, idx) => {
      const id = `p_${guest.name.toLowerCase()}`;
      players[guest.token] = {
        id,
        name: guest.name,
        isRoomCreator: guest.isCreator,
        seatNumber: idx + 1,
        connected: true,
        score: 0,
      };
      state.seatingOrder.push(id);
      demoObjects.push({
        id: `obj_${id}`,
        contributorId: id,
        contributorName: guest.name,
        name: guest.defaultObject,
        hasPresented: true,
      });
    });

    if (state.exhibitAState) {
      state.exhibitAState.objects = demoObjects;
    }

    const record: LocalRoomRecord = {
      code,
      creatorToken,
      state,
      players,
    };

    this.saveRoom(record);
    return record;
  }

  public getState(roomCode: string, playerToken?: string, isHost = false): ClientGameState | null {
    const room = this.getRoom(roomCode);
    if (!room) return null;
    return sanitizeLocalState(room.state, room.players, playerToken, isHost);
  }

  public processAction(
    roomCode: string,
    action: string,
    payload?: any,
    playerToken?: string,
    isHost = false
  ): ClientGameState | null {
    const code = roomCode.toUpperCase();
    let room = this.getRoom(code);
    if (!room && code === 'DEMO7') {
      room = this.setupDemoRoomRecord();
    }
    if (!room) return null;

    const s = room.state;
    let player = playerToken
      ? room.players[playerToken] || Object.values(room.players).find(p => p.id === playerToken)
      : undefined;
    if (!player && (payload?.targetPlayerId || payload?.playerId)) {
      const targetId = payload.targetPlayerId || payload.playerId;
      player = Object.values(room.players).find(p => p.id === targetId);
    }

    switch (action) {
      case 'ADD_FAILSAFE_PLAYER': {
        const playersList = Object.values(room.players || {});
        let name = (payload?.name || '').trim();
        if (!name) {
          name = `Guest ${playersList.length + 1}`;
        }
        const existingNames = playersList.map(p => p.name.toLowerCase());
        if (existingNames.includes(name.toLowerCase())) {
          let suffix = 2;
          while (existingNames.includes(`${name.toLowerCase()} ${suffix}`)) {
            suffix++;
          }
          name = `${name} ${suffix}`;
        }
        const newToken = generateId('token_');
        const newPlayerId = generateId('p_');
        const seatNumber = playersList.length + 1;
        room.players[newToken] = {
          id: newPlayerId,
          name,
          isRoomCreator: false,
          seatNumber,
          connected: true,
          score: 0,
          role: s.phase !== 'LOBBY' ? 'FAITHFUL' : undefined,
        };
        if (!s.seatingOrder.includes(newPlayerId)) {
          s.seatingOrder.push(newPlayerId);
        }
        if (s.getawayAuctionState) {
          s.getawayAuctionState.playerCoins[newPlayerId] = 12;
        }
        break;
      }

      case 'UPDATE_SEATING_ORDER': {
        if (payload?.seatingOrder && Array.isArray(payload.seatingOrder)) {
          s.seatingOrder = payload.seatingOrder;
          s.seatingOrder.forEach((pId, idx) => {
            const found = Object.values(room!.players).find(p => p.id === pId);
            if (found) found.seatNumber = idx + 1;
          });
        }
        break;
      }

      case 'START_GAME': {
        const dialogue = getDefaultDialogue('INTRO', s.currentRound);
        setPhaseWithTimer(s, 'INTRO', 480, dialogue);
        break;
      }

      case 'ADVANCE_TO_ROLE_BRIEFING': {
        assignSecretRoles(s, room.players);
        const dialogue = getDefaultDialogue('ROLE_BRIEFING', s.currentRound);
        setPhaseWithTimer(s, 'ROLE_BRIEFING', 60, dialogue);
        break;
      }

      case 'ADVANCE_TO_MISSION': {
        if (!s.traitorId) {
          assignSecretRoles(s, room.players);
        }
        if (s.currentRound === 2 && !s.birthdayMajorityState) {
          const assignedQ = BIRTHDAY_MAJORITY_QUESTION_POOL[0];
          const faithfulList = Object.values(room.players).filter(p => p.id !== s.traitorId);
          const targetFaithful =
            faithfulList.length > 0
              ? faithfulList[Math.floor(Math.random() * faithfulList.length)]
              : undefined;
          s.birthdayMajorityState = {
            questions: BIRTHDAY_MAJORITY_QUESTION_POOL.slice(0, 5),
            step: 'INITIAL_ANSWERS',
            activeQuestionIndex: 0,
            initialAnswers: {},
            allInitialAnswersLocked: false,
            predictions: {},
            playerCorrectCount: {},
            traitorTargetFaithfulId: targetFaithful?.id,
            traitorTargetFaithfulName: targetFaithful?.name,
            traitorAssignedQuestionId: assignedQ?.id || 1,
            traitorAssignmentSuccess: false,
          };
        }
        const dialogue = getDefaultDialogue('MISSION', s.currentRound);
        setPhaseWithTimer(s, 'MISSION', 420, dialogue);
        break;
      }

      // -------------------------------------------------------------------
      // MISSION 1: EXHIBIT A ACTIONS
      // -------------------------------------------------------------------
      case 'EXHIBIT_A_SUBMIT_OBJECT': {
        if (!s.exhibitAState) break;
        const actingPlayer =
          (s.isDemoRoom && payload?.targetPlayerId
            ? Object.values(room.players).find(p => p.id === payload.targetPlayerId)
            : null) || player;
        if (!actingPlayer) break;
        const objectName = (payload?.objectName || '').trim();
        if (!objectName) break;

        const existingIdx = s.exhibitAState.objects.findIndex(o => o.contributorId === actingPlayer.id);
        if (existingIdx >= 0) {
          s.exhibitAState.objects[existingIdx].name = objectName;
        } else {
          s.exhibitAState.objects.push({
            id: `obj_${actingPlayer.id}`,
            contributorId: actingPlayer.id,
            contributorName: actingPlayer.name,
            name: objectName,
            hasPresented: false,
          });
        }
        break;
      }

      case 'EXHIBIT_A_LOCK_OBJECTS': {
        if (!s.exhibitAState) break;
        s.exhibitAState.isListLocked = true;
        s.exhibitAState.stage = 'SECRET_BRIEFING';

        if (!s.traitorId) {
          assignSecretRoles(s, room.players);
        }

        const defaultPool = [
          'Wooden Spoon',
          'Single Sock',
          'Tea Towel',
          'Screwdriver',
          'Rubber Duck',
          'Coffee Mug',
          'Candlestick',
          'Antique Pocket Watch',
          'Vintage Silk Scarf',
          'Brass Key',
        ];
        Object.values(room.players).forEach((p, idx) => {
          const existing = s.exhibitAState!.objects.find(o => o.contributorId === p.id);
          if (!existing) {
            s.exhibitAState!.objects.push({
              id: `obj_${p.id}`,
              contributorId: p.id,
              contributorName: p.name,
              name: defaultPool[idx % defaultPool.length] || `Artifact ${idx + 1}`,
              hasPresented: false,
            });
          } else if (!existing.name || !existing.name.trim()) {
            existing.name = defaultPool[idx % defaultPool.length] || `Artifact ${idx + 1}`;
          }
        });

        let eligibleObjects = s.exhibitAState.objects.filter(
          o => o.contributorId !== s.traitorId && o.name && o.name.trim().length > 0
        );
        if (eligibleObjects.length === 0) {
          eligibleObjects = s.exhibitAState.objects.filter(o => o.name && o.name.trim().length > 0);
        }
        if (eligibleObjects.length === 0) {
          const fallbackObj = {
            id: `obj_evidence_1`,
            contributorId: 'p_evidence',
            contributorName: 'The Castle',
            name: 'Candlestick',
            hasPresented: false,
          };
          s.exhibitAState.objects.push(fallbackObj);
          eligibleObjects = [fallbackObj];
        }

        const selected = eligibleObjects[Math.floor(Math.random() * eligibleObjects.length)];
        s.exhibitAState.plantedObjectId = selected.id;
        s.exhibitAState.plantedObjectName = selected.name;

        const traitorPlayer = Object.values(room.players).find(p => p.id === s.traitorId);
        if (traitorPlayer) {
          traitorPlayer.secretMission = `Your planted evidence is: ${selected.name}. Get this object chosen as Exhibit A. Everyone knows you’re pushing for something. Nobody knows which object it is. Make them believe it was their idea.`;
        }
        break;
      }

      case 'EXHIBIT_A_ACKNOWLEDGE': {
        if (!s.exhibitAState) break;
        const actingPlayer =
          (s.isDemoRoom && payload?.targetPlayerId
            ? Object.values(room.players).find(p => p.id === payload.targetPlayerId)
            : null) || player;
        if (!actingPlayer) break;
        if (!s.exhibitAState.acknowledgedPlayerIds.includes(actingPlayer.id)) {
          s.exhibitAState.acknowledgedPlayerIds.push(actingPlayer.id);
        }
        const totalPlayers = Object.keys(room.players).length;
        if (s.exhibitAState.acknowledgedPlayerIds.length >= totalPlayers) {
          s.exhibitAState.stage = 'PRESENTATIONS';
        }
        break;
      }

      case 'EXHIBIT_A_START_PRESENTATIONS': {
        if (!s.exhibitAState) break;
        s.exhibitAState.stage = 'PRESENTATIONS';
        break;
      }

      case 'EXHIBIT_A_TOGGLE_PRESENTED': {
        if (!s.exhibitAState) break;
        const objId = payload?.objectId;
        const contributorId = payload?.contributorId;
        const targetObj = s.exhibitAState.objects.find(
          o => (objId && o.id === objId) || (contributorId && o.contributorId === contributorId)
        );
        if (targetObj) {
          targetObj.hasPresented = !targetObj.hasPresented;
        }
        break;
      }

      case 'EXHIBIT_A_OPEN_VOTING':
      case 'EXHIBIT_A_START_VOTING': {
        if (!s.exhibitAState) break;
        s.exhibitAState.stage = 'EVIDENCE_VOTING';
        s.exhibitAState.evidenceVotes = {};
        s.exhibitAState.isEvidenceVoteLocked = false;
        s.exhibitAState.evidenceVoteRevealed = false;
        break;
      }

      case 'EXHIBIT_A_CAST_VOTE':
      case 'EXHIBIT_A_VOTE': {
        if (!s.exhibitAState) break;
        const actingPlayer =
          (s.isDemoRoom && payload?.targetPlayerId
            ? Object.values(room.players).find(p => p.id === payload.targetPlayerId)
            : null) || player;
        if (!actingPlayer) break;
        const objId = payload?.objectId;
        if (!objId) break;

        s.exhibitAState.evidenceVotes[actingPlayer.id] = objId;
        const totalCount = Object.keys(room.players).length;
        if (Object.keys(s.exhibitAState.evidenceVotes).length >= totalCount) {
          s.exhibitAState.isEvidenceVoteLocked = true;
        }
        break;
      }

      case 'EXHIBIT_A_REVEAL_VOTES':
      case 'EXHIBIT_A_RESOLVE_VOTES': {
        if (!s.exhibitAState) break;
        const tallies: Record<string, number> = {};
        Object.values(s.exhibitAState.evidenceVotes).forEach(objId => {
          tallies[objId] = (tallies[objId] || 0) + 1;
        });

        let maxVotes = 0;
        let tiedObjIds: string[] = [];
        Object.entries(tallies).forEach(([objId, count]) => {
          if (count > maxVotes) {
            maxVotes = count;
            tiedObjIds = [objId];
          } else if (count === maxVotes) {
            tiedObjIds.push(objId);
          }
        });

        if (tiedObjIds.length > 1) {
          s.exhibitAState.isEvidenceTieRevote = true;
          s.exhibitAState.tiedObjectIds = tiedObjIds;
          s.exhibitAState.evidenceVoteRevealed = true;
        } else if (tiedObjIds.length === 1) {
          s.exhibitAState.winningObjectId = tiedObjIds[0];
          s.exhibitAState.evidenceVoteRevealed = true;
          s.exhibitAState.stage = 'COMPLETED';
        }
        break;
      }

      case 'EXHIBIT_A_TIE_REVOTE': {
        if (!s.exhibitAState) break;
        s.exhibitAState.evidenceVotes = {};
        s.exhibitAState.isEvidenceVoteLocked = false;
        s.exhibitAState.evidenceVoteRevealed = false;
        s.exhibitAState.stage = 'EVIDENCE_VOTING';
        break;
      }

      // -------------------------------------------------------------------
      // MISSION 2: BIRTHDAY MAJORITY ACTIONS
      // -------------------------------------------------------------------
      case 'SUBMIT_MAJORITY_INITIAL_ANSWER':
      case 'MAJORITY_SUBMIT_ANSWER': {
        if (!s.birthdayMajorityState) break;
        const actingPlayer =
          (s.isDemoRoom && payload?.targetPlayerId
            ? Object.values(room.players).find(p => p.id === payload.targetPlayerId)
            : null) || player;
        if (!actingPlayer) break;
        const { questionId, chosenName } = payload || {};
        if (!questionId || !chosenName) break;

        if (!s.birthdayMajorityState.initialAnswers) {
          s.birthdayMajorityState.initialAnswers = {};
        }
        if (!s.birthdayMajorityState.initialAnswers[actingPlayer.id]) {
          s.birthdayMajorityState.initialAnswers[actingPlayer.id] = {};
        }

        s.birthdayMajorityState.initialAnswers[actingPlayer.id][questionId] = chosenName;
        (s.birthdayMajorityState.initialAnswers[actingPlayer.id] as any)[String(questionId)] = chosenName;

        recalculateMajorityResults(s, room.players);
        break;
      }

      case 'UPDATE_BIRTHDAY_MAJORITY': {
        if (!s.birthdayMajorityState) break;
        if (typeof payload?.activeQuestionIndex === 'number') {
          s.birthdayMajorityState.activeQuestionIndex = payload.activeQuestionIndex;
        }
        if (payload?.step) {
          s.birthdayMajorityState.step = payload.step;
        }
        recalculateMajorityResults(s, room.players);
        break;
      }

      case 'MAJORITY_LOCK_ALL_INITIAL': {
        if (!s.birthdayMajorityState) break;
        s.birthdayMajorityState.allInitialAnswersLocked = true;
        s.birthdayMajorityState.step = 'PREDICTION_REVEAL';
        s.birthdayMajorityState.activeQuestionIndex = 0;
        recalculateMajorityResults(s, room.players);
        break;
      }

      case 'MAJORITY_NEXT_QUESTION': {
        if (!s.birthdayMajorityState) break;
        const nextIdx = (s.birthdayMajorityState.activeQuestionIndex || 0) + 1;
        if (nextIdx < s.birthdayMajorityState.questions.length) {
          s.birthdayMajorityState.activeQuestionIndex = nextIdx;
        } else {
          s.birthdayMajorityState.step = 'COMPLETED';
        }
        break;
      }

      // -------------------------------------------------------------------
      // MISSION 3: FORGERY GALLERY ACTIONS
      // -------------------------------------------------------------------
      case 'FORGERY_LOCK_DRAWING': {
        if (!s.forgeryGalleryState) break;
        s.forgeryGalleryState.isDrawingLocked = true;
        break;
      }

      case 'UPDATE_FORGERY_GALLERY': {
        if (!s.forgeryGalleryState) break;
        if (payload?.qualifiedMilestones) {
          s.forgeryGalleryState.qualifiedMilestones = payload.qualifiedMilestones;
        }
        if (typeof payload?.isDrawingLocked === 'boolean') {
          s.forgeryGalleryState.isDrawingLocked = payload.isDrawingLocked;
        }
        break;
      }

      case 'FORGERY_UPDATE_MILESTONE': {
        if (!s.forgeryGalleryState) break;
        const { playerId, milestone, value } = payload || {};
        if (!playerId || !milestone) break;
        if (!s.forgeryGalleryState.qualifiedMilestones[playerId]) {
          s.forgeryGalleryState.qualifiedMilestones[playerId] = {
            person: false,
            setting: false,
            threeObjects: false,
          };
        }
        if (milestone in s.forgeryGalleryState.qualifiedMilestones[playerId]) {
          (s.forgeryGalleryState.qualifiedMilestones[playerId] as any)[milestone] = !!value;
        }
        break;
      }

      // -------------------------------------------------------------------
      // MISSION 4: BODY DISPOSAL COMMITTEE ACTIONS
      // -------------------------------------------------------------------
      case 'UPDATE_BODY_DISPOSAL': {
        if (!s.bodyDisposalState) break;
        if (Array.isArray(payload?.chosenFiveObjects)) {
          s.bodyDisposalState.chosenFiveObjects = payload.chosenFiveObjects;
        }
        if (payload?.milestones) {
          s.bodyDisposalState.milestones = {
            ...s.bodyDisposalState.milestones,
            ...payload.milestones,
          };
        }
        break;
      }

      case 'BODY_DISPOSAL_CONFIRM_OBJECTS': {
        if (!s.bodyDisposalState) break;
        if (payload?.items && Array.isArray(payload.items)) {
          s.bodyDisposalState.confirmedHouseholdItems = payload.items;
        }
        break;
      }

      case 'BODY_DISPOSAL_CHOOSE_FIVE': {
        if (!s.bodyDisposalState) break;
        if (payload?.chosenObjects && Array.isArray(payload.chosenObjects)) {
          s.bodyDisposalState.chosenFiveObjects = payload.chosenObjects;
          s.bodyDisposalState.milestones.fiveObjectsChosen = payload.chosenObjects.length === 5;
        }
        break;
      }

      case 'BODY_DISPOSAL_UPDATE_MILESTONE': {
        if (!s.bodyDisposalState) break;
        const { milestone, value } = payload || {};
        if (milestone && milestone in s.bodyDisposalState.milestones) {
          (s.bodyDisposalState.milestones as any)[milestone] = !!value;
        }
        break;
      }

      // -------------------------------------------------------------------
      // MISSION 5: COUNTERFEIT EXPERT ACTIONS
      // -------------------------------------------------------------------
      case 'UPDATE_COUNTERFEIT_EXPERT': {
        if (!s.counterfeitExpertState) break;
        if (payload?.playerMilestones) {
          s.counterfeitExpertState.playerMilestones = payload.playerMilestones;
        }
        if (typeof payload?.traitorGuessedWordSuccess === 'boolean') {
          s.counterfeitExpertState.traitorGuessedWordSuccess = payload.traitorGuessedWordSuccess;
        }
        break;
      }

      case 'COUNTERFEIT_UPDATE_MILESTONE': {
        if (!s.counterfeitExpertState) break;
        const { playerId, milestone, value } = payload || {};
        if (!playerId || !milestone) break;
        if (!s.counterfeitExpertState.playerMilestones[playerId]) {
          s.counterfeitExpertState.playerMilestones[playerId] = {
            under30Seconds: false,
            word1Used: false,
            word2Used: false,
            word3Attempted: false,
          };
        }
        if (milestone in s.counterfeitExpertState.playerMilestones[playerId]) {
          (s.counterfeitExpertState.playerMilestones[playerId] as any)[milestone] = !!value;
        }
        break;
      }

      case 'COUNTERFEIT_RESOLVE_TRAITOR_GUESS': {
        if (!s.counterfeitExpertState) break;
        s.counterfeitExpertState.traitorGuessedWordSuccess = !!payload?.success;
        break;
      }

      // -------------------------------------------------------------------
      // GENERAL ROUND PROGRESSION: ROUND TABLE & VOTING
      // -------------------------------------------------------------------
      case 'ADVANCE_TO_ROUND_TABLE': {
        const dialogue = getDefaultDialogue('ROUND_TABLE', s.currentRound);
        setPhaseWithTimer(s, 'ROUND_TABLE', 480, dialogue);
        break;
      }

      case 'ADVANCE_TO_VOTING': {
        const dialogue = getDefaultDialogue('VOTING', s.currentRound);
        setPhaseWithTimer(s, 'VOTING', 120, dialogue);
        Object.values(room.players).forEach(p => {
          p.hasLockedVote = false;
          p.hasRevealedSlate = false;
          p.votedForPlayerId = undefined;
          p.votedForPlayerName = undefined;
        });
        break;
      }

      case 'LOCK_VOTE': {
        if (!player) break;
        const targetId = payload?.targetPlayerId;
        if (!targetId || targetId === player.id) break;
        const target = Object.values(room.players).find(p => p.id === targetId);
        if (!target) break;

        player.votedForPlayerId = target.id;
        player.votedForPlayerName = target.name;
        player.hasLockedVote = true;

        const allLocked = Object.values(room.players).every(p => p.hasLockedVote);
        if (allLocked) {
          s.phase = s.isTieRevote ? 'TIE_REVEALS' : 'VOTE_REVEALS';
          s.currentRevealIndex = 0;
          s.latestDialogue = HOST_SCRIPTS[s.currentRound]?.allVotesLocked || '';
        }
        break;
      }

      case 'FINISH_PHONE_SLATE': {
        if (s.phase !== 'VOTE_REVEALS' && s.phase !== 'TIE_REVEALS') break;
        const activePlayerId = s.seatingOrder[s.currentRevealIndex];
        const revealingPlayer = Object.values(room.players).find(p => p.id === activePlayerId);
        if (revealingPlayer) {
          revealingPlayer.hasRevealedSlate = true;
          s.latestDialogue = `${revealingPlayer.name} has pointed the finger at ${revealingPlayer.votedForPlayerName}.`;
        }

        s.currentRevealIndex += 1;

        if (s.currentRevealIndex >= s.seatingOrder.length) {
          const tallies: Record<string, number> = {};
          Object.values(room.players).forEach(p => {
            if (p.votedForPlayerId) {
              tallies[p.votedForPlayerId] = (tallies[p.votedForPlayerId] || 0) + 1;
            }
          });

          let maxVotes = 0;
          let candidatesWithMax: string[] = [];
          Object.entries(tallies).forEach(([candId, count]) => {
            if (count > maxVotes) {
              maxVotes = count;
              candidatesWithMax = [candId];
            } else if (count === maxVotes) {
              candidatesWithMax.push(candId);
            }
          });

          if (candidatesWithMax.length > 1) {
            if (!s.isTieRevote) {
              s.isTieRevote = true;
              s.tieCandidateIds = candidatesWithMax;
              s.phase = 'TIE_DEFENCE';
              const candidateNames = candidatesWithMax.map(
                cId => Object.values(room!.players).find(p => p.id === cId)?.name || 'Guest'
              );
              setPhaseWithTimer(
                s,
                'TIE_DEFENCE',
                60,
                HOST_SCRIPTS[s.currentRound]?.tieOccurred(candidateNames) || 'A deadlock at the Round Table!'
              );
            } else {
              s.isTieRevote = false;
              s.phase = 'BANISHMENT_OUTCOME';
              s.latestDialogue =
                HOST_SCRIPTS[s.currentRound]?.tieBanishmentFailed ||
                'Deadlock remains unbroken. No one is banished tonight.';
              recordRoundOutcome(s, room.players, null, false);
            }
          } else if (candidatesWithMax.length === 1) {
            s.isTieRevote = false;
            const banishedId = candidatesWithMax[0];
            const banishedPlayer = Object.values(room.players).find(p => p.id === banishedId);
            const wasTraitor = banishedId === s.traitorId;
            s.phase = 'BANISHMENT_OUTCOME';
            s.latestDialogue = (HOST_SCRIPTS[s.currentRound] || HOST_SCRIPTS[1]).banishment(
              banishedPlayer?.name || 'Someone',
              wasTraitor
            );
            recordRoundOutcome(s, room.players, banishedId, wasTraitor);
          }
        }
        break;
      }

      case 'START_TIE_REVOTE': {
        setPhaseWithTimer(s, 'TIE_VOTING', 90, s.latestDialogue);
        s.currentRevealIndex = 0;
        Object.values(room.players).forEach(p => {
          p.hasLockedVote = false;
          p.hasRevealedSlate = false;
          p.votedForPlayerId = undefined;
          p.votedForPlayerName = undefined;
        });
        break;
      }

      case 'CONFIRM_ASSIGNMENT_RESULT': {
        const success = !!payload?.success;
        const lastHistory = s.roundHistory[s.roundHistory.length - 1];
        if (lastHistory) {
          lastHistory.traitorAssignmentCompleted = success;
          const traitorId = s.traitorId;
          if (traitorId && lastHistory.scoreBreakdown[traitorId]) {
            const prevPts = lastHistory.scoreBreakdown[traitorId].personalObjectivePoints;
            const newPts = success ? 2 : 0;
            const diff = newPts - prevPts;
            lastHistory.scoreBreakdown[traitorId].personalObjectivePoints = newPts;
            lastHistory.scoreBreakdown[traitorId].totalRoundPoints += diff;
            lastHistory.roundScores[traitorId] += diff;
            const traitor = Object.values(room.players).find(p => p.id === traitorId);
            if (traitor) traitor.score += diff;
          }
        }
        s.phase = 'ROUND_SUMMARY';
        break;
      }

      case 'ADVANCE_NEXT_ROUND': {
        if (s.currentRound < 6) {
          s.currentRound += 1;
          const dialogue = getDefaultDialogue('INTRO', s.currentRound);
          setPhaseWithTimer(s, 'INTRO', 60, dialogue);
        }
        break;
      }

      // -------------------------------------------------------------------
      // ROUND 6: AUCTION & FINALE ACTIONS
      // -------------------------------------------------------------------
      case 'UPDATE_GETAWAY_AUCTION': {
        if (!s.getawayAuctionState) break;
        if (typeof payload?.currentLotIndex === 'number') {
          s.getawayAuctionState.currentLotIndex = payload.currentLotIndex;
        }
        if (typeof payload?.activeLotBidsLocked === 'boolean') {
          s.getawayAuctionState.activeLotBidsLocked = payload.activeLotBidsLocked;
        }
        break;
      }

      case 'SUBMIT_AUCTION_BID': {
        if (!s.getawayAuctionState || !player) break;
        const { lotNumber, bid } = payload || {};
        if (!lotNumber) break;
        if (!s.getawayAuctionState.bids[lotNumber]) {
          s.getawayAuctionState.bids[lotNumber] = {};
        }
        s.getawayAuctionState.bids[lotNumber][player.id] = bid;
        break;
      }

      case 'RESOLVE_AUCTION_LOT': {
        if (!s.getawayAuctionState) break;
        const { lotNumber, winnerId, winningBid } = payload || {};
        const winner = Object.values(room.players).find(p => p.id === winnerId);
        const lot = s.getawayAuctionState.lots.find(l => l.lotNumber === lotNumber);

        if (winner && lot) {
          s.getawayAuctionState.lotWinners[lotNumber] = {
            winnerId,
            winnerName: winner.name,
            winningBid,
          };
          s.getawayAuctionState.playerCoins[winnerId] = Math.max(
            0,
            (s.getawayAuctionState.playerCoins[winnerId] ?? 12) - winningBid
          );
          s.getawayAuctionState.playerEscapePoints[winnerId] =
            (s.getawayAuctionState.playerEscapePoints[winnerId] ?? 0) + lot.escapePoints;
          if (!s.getawayAuctionState.purchasedLots[winnerId]) {
            s.getawayAuctionState.purchasedLots[winnerId] = [];
          }
          s.getawayAuctionState.purchasedLots[winnerId].push(lotNumber);
        }

        if (lotNumber === 6) {
          s.phase = 'FINALE_AUCTION_RECAP';
          s.latestDialogue =
            'The auction is over. Your money has gone. Your Traitor hasn’t. From this moment, if you’re banished, you’re finished.';
        }
        break;
      }

      case 'FINALE_START_DISCUSSION': {
        if (!s.finaleState) break;
        s.phase = 'FINALE_DISCUSSION';
        s.finaleState.stage = 'DISCUSSION';
        setPhaseWithTimer(
          s,
          'FINALE_DISCUSSION',
          180,
          `Discussion Cycle ${s.finaleState.cycleNumber}. Four minutes on the clock to question the survivors.`
        );
        break;
      }

      case 'FINALE_OPEN_VOTING': {
        if (!s.finaleState) break;
        s.phase = 'FINALE_VOTING';
        s.finaleState.stage = 'VOTING';
        setPhaseWithTimer(
          s,
          'FINALE_VOTING',
          120,
          'Banishment — vote for a PERSON. Permanent elimination. Choose with utmost care.'
        );
        Object.values(room.players).forEach(p => {
          p.hasLockedVote = false;
          p.hasRevealedSlate = false;
          p.votedForPlayerId = undefined;
          p.votedForPlayerName = undefined;
        });
        break;
      }

      case 'FINALE_LOCK_VOTE': {
        if (!s.finaleState || !player || player.isEliminated) break;
        const targetId = payload?.targetPlayerId;
        if (!targetId || targetId === player.id) break;
        const target = Object.values(room.players).find(p => p.id === targetId);
        if (!target || target.isEliminated) break;

        player.votedForPlayerId = target.id;
        player.votedForPlayerName = target.name;
        player.hasLockedVote = true;

        if (s.finaleState.cycleNumber === 1 && !s.finaleState.firstBanishmentVotes[player.id]) {
          s.finaleState.firstBanishmentVotes[player.id] = target.id;
        }

        const activeSurvivors = Object.values(room.players).filter(p => !p.isEliminated);
        const allLocked = activeSurvivors.every(p => p.hasLockedVote);
        if (allLocked) {
          s.phase = 'FINALE_VOTE_REVEALS';
          s.finaleState.stage = 'VOTE_REVEALS';
          s.currentRevealIndex = 0;
          s.latestDialogue = 'All surviving slates locked. Let the slates turn in seating order.';
        }
        break;
      }

      case 'FINALE_FINISH_SLATE': {
        if (!s.finaleState) break;
        const activeSurvivors = s.seatingOrder.filter(id => {
          const pl = Object.values(room!.players).find(p => p.id === id);
          return !pl?.isEliminated;
        });
        const activePlayerId = activeSurvivors[s.currentRevealIndex];
        const revealingPlayer = Object.values(room.players).find(p => p.id === activePlayerId);

        if (revealingPlayer) {
          revealingPlayer.hasRevealedSlate = true;
          s.latestDialogue = `${revealingPlayer.name} has pointed the finger at ${revealingPlayer.votedForPlayerName}.`;
        }

        s.currentRevealIndex += 1;

        if (s.currentRevealIndex >= activeSurvivors.length) {
          const tallies: Record<string, number> = {};
          Object.values(room.players)
            .filter(p => !p.isEliminated)
            .forEach(p => {
              if (p.votedForPlayerId) {
                tallies[p.votedForPlayerId] = (tallies[p.votedForPlayerId] || 0) + 1;
              }
            });

          let maxVotes = 0;
          let candidatesWithMax: string[] = [];
          Object.entries(tallies).forEach(([candId, count]) => {
            if (count > maxVotes) {
              maxVotes = count;
              candidatesWithMax = [candId];
            } else if (count === maxVotes) {
              candidatesWithMax.push(candId);
            }
          });

          if (candidatesWithMax.length > 1) {
            if (!s.isTieRevote) {
              s.isTieRevote = true;
              s.tieCandidateIds = candidatesWithMax;
              s.phase = 'FINALE_TIE_DEFENCE';
              s.finaleState.stage = 'TIE_DEFENCE';
              setPhaseWithTimer(s, 'FINALE_TIE_DEFENCE', 60, 'Deadlock in the finale! Sixty seconds to defend.');
            } else {
              s.isTieRevote = false;
              s.phase = 'FINALE_DISCUSSION';
              s.finaleState.stage = 'DISCUSSION';
              setPhaseWithTimer(
                s,
                'FINALE_DISCUSSION',
                120,
                'Tied revote! No banishment. Discussion must resume until an elimination is decided.'
              );
            }
          } else if (candidatesWithMax.length === 1) {
            s.isTieRevote = false;
            const banishedId = candidatesWithMax[0];
            const banishedPlayer = Object.values(room.players).find(p => p.id === banishedId);
            if (banishedPlayer) {
              banishedPlayer.isEliminated = true;
            }
            s.finaleState.eliminatedPlayerIds.push(banishedId);
            s.finaleState.currentEliminatedPlayerId = banishedId;
            s.finaleState.eliminationCount += 1;
            s.phase = 'FINALE_ELIMINATION';
            s.finaleState.stage = 'ELIMINATION_OUTCOME';
            s.latestDialogue = `The circle has closed. ${banishedPlayer?.name || 'Someone'} has been permanently eliminated. Their identity remains shrouded in mist.`;
          }
        }
        break;
      }

      case 'FINALE_NEXT_CYCLE': {
        if (!s.finaleState) break;
        const remainingSurvivors = Object.values(room.players).filter(p => !p.isEliminated);

        if (remainingSurvivors.length > 4) {
          s.finaleState.cycleNumber += 1;
          s.phase = 'FINALE_DISCUSSION';
          s.finaleState.stage = 'DISCUSSION';
          setPhaseWithTimer(
            s,
            'FINALE_DISCUSSION',
            180,
            `Discussion Cycle ${s.finaleState.cycleNumber}. ${remainingSurvivors.length} survivors remain.`
          );
        } else if (remainingSurvivors.length === 4) {
          s.phase = 'FINALE_END_OR_BANISH';
          s.finaleState.stage = 'END_OR_BANISH';
          s.finaleState.endOrBanishChoices = {};
          s.finaleState.endOrBanishRevealed = false;
          setPhaseWithTimer(
            s,
            'FINALE_END_OR_BANISH',
            120,
            'Final Four. Each survivor must privately choose: END THE GAME or BANISH AGAIN.'
          );
        } else if (remainingSurvivors.length <= 2) {
          s.phase = 'FINALE_FINAL_REVEAL';
          s.finaleState.stage = 'FINAL_REVEAL';
          s.finaleState.revealedSurvivorIds = [];
          s.finaleState.currentSurvivorRevealIndex = 0;
        }
        break;
      }

      case 'FINALE_SUBMIT_END_OR_BANISH': {
        if (!s.finaleState || !player || player.isEliminated) break;
        const choice = payload?.choice as 'END' | 'BANISH';
        if (!choice) break;

        s.finaleState.endOrBanishChoices[player.id] = choice;
        const survivors = Object.values(room.players).filter(p => !p.isEliminated);

        if (Object.keys(s.finaleState.endOrBanishChoices).length >= survivors.length) {
          s.finaleState.endOrBanishRevealed = true;
          const allEnd = survivors.every(p => s.finaleState?.endOrBanishChoices[p.id] === 'END');

          if (allEnd) {
            s.phase = 'FINALE_FINAL_REVEAL';
            s.finaleState.stage = 'FINAL_REVEAL';
            s.finaleState.revealedSurvivorIds = [];
            s.finaleState.currentSurvivorRevealIndex = 0;
          } else {
            s.phase = 'FINALE_DISCUSSION';
            s.finaleState.stage = 'DISCUSSION';
            s.finaleState.cycleNumber += 1;
            setPhaseWithTimer(
              s,
              'FINALE_DISCUSSION',
              180,
              'A survivor chose to BANISH AGAIN! The hunt continues. One more must be eliminated.'
            );
          }
        }
        break;
      }

      case 'FINALE_REVEAL_NEXT_SURVIVOR': {
        if (!s.finaleState) break;
        const survivors = Object.values(room.players).filter(p => !p.isEliminated);
        const currIdx = s.finaleState.currentSurvivorRevealIndex;

        if (currIdx < survivors.length) {
          const survivor = survivors[currIdx];
          s.finaleState.revealedSurvivorIds.push(survivor.id);
          s.finaleState.currentSurvivorRevealIndex += 1;

          if (s.finaleState.currentSurvivorRevealIndex >= survivors.length) {
            s.finaleState.allSurvivorsRevealed = true;
          }
        }
        break;
      }

      case 'FINALE_REVEAL_ALL_OUTCOMES': {
        if (!s.finaleState) break;
        const playersList = Object.values(room.players);
        const survivors = playersList.filter(p => !p.isEliminated);
        survivors.forEach(sP => (sP.survivedFinale = true));

        const traitor = playersList.find(p => p.id === s.traitorId);
        const isTraitorAlive = survivors.some(p => p.id === s.traitorId);

        const round6Scores: Record<string, number> = {};
        const round6Breakdown: Record<string, PlayerScoreBreakdown> = {};

        playersList.forEach(p => {
          const esc = s.getawayAuctionState?.playerEscapePoints?.[p.id] || 0;
          const missionPoints = Math.min(3, Math.max(0, Math.floor(esc / 2)));

          let personalObjectivePoints = 0;
          if (p.role === 'FAITHFUL') {
            if (s.finaleState?.firstBanishmentVotes[p.id] === s.traitorId) {
              personalObjectivePoints = 2;
            }
          } else if (p.role === 'TRAITOR') {
            if (s.getawayAuctionState?.traitorAssignmentSuccess) {
              personalObjectivePoints = 2;
            }
          }

          let roundOutcomePoints = 0;
          if (p.role === 'FAITHFUL') {
            if (!isTraitorAlive) roundOutcomePoints = 1;
          } else if (p.role === 'TRAITOR') {
            if (isTraitorAlive) roundOutcomePoints = 1;
          }

          const totalRound6 = missionPoints + personalObjectivePoints + roundOutcomePoints;
          p.score += totalRound6;
          p.lastRoundScore = totalRound6;
          round6Scores[p.id] = totalRound6;
          round6Breakdown[p.id] = {
            missionPoints,
            personalObjectivePoints,
            roundOutcomePoints,
            totalRoundPoints: totalRound6,
          };
        });

        s.roundHistory.push({
          roundNumber: 6,
          traitorId: s.traitorId || '',
          traitorName: traitor?.name || 'Unknown',
          banishedPlayerId: s.finaleState.eliminatedPlayerIds.join(','),
          banishedPlayerName: null,
          wasTraitorBanished: !isTraitorAlive,
          traitorAssignmentCompleted: !!s.getawayAuctionState?.traitorAssignmentSuccess,
          firstBallotVotes: s.finaleState.firstBanishmentVotes,
          scoreBreakdown: round6Breakdown,
          roundScores: round6Scores,
        });

        let overallWinnerId = '';
        let overallWinnerName = '';
        let isTraitorWinner = false;
        let jointWinnerNames: string[] = [];

        if (isTraitorAlive && traitor) {
          overallWinnerId = traitor.id;
          overallWinnerName = traitor.name;
          isTraitorWinner = true;
        } else {
          const sortedSurvivors = [...survivors].sort((a, b) => b.score - a.score);
          const topScore = sortedSurvivors[0]?.score ?? 0;
          const topSurvivors = sortedSurvivors.filter(sp => sp.score === topScore);

          if (topSurvivors.length === 1) {
            overallWinnerId = topSurvivors[0].id;
            overallWinnerName = topSurvivors[0].name;
          } else {
            jointWinnerNames = topSurvivors.map(sp => sp.name);
            overallWinnerName = jointWinnerNames.join(' & ');
          }
        }

        const sortedByScoreAsc = [...playersList].sort((a, b) => a.score - b.score);
        const lowestScore = sortedByScoreAsc[0]?.score ?? 0;
        const losers = sortedByScoreAsc.filter(p => p.score === lowestScore);

        s.finaleState.overallWinnerId = overallWinnerId;
        s.finaleState.overallWinnerName = overallWinnerName;
        s.finaleState.isTraitorWinner = isTraitorWinner;
        s.finaleState.jointWinnerNames = jointWinnerNames.length > 1 ? jointWinnerNames : undefined;
        s.finaleState.loserPlayerId = losers.length === 1 ? losers[0].id : undefined;
        s.finaleState.loserPlayerName = losers.length === 1 ? losers[0].name : undefined;
        s.finaleState.jointLoserNames = losers.length > 1 ? losers.map(l => l.name) : undefined;

        s.phase = 'FINAL_RESULTS';
        s.finaleState.stage = 'FINAL_REVEAL';
        s.latestDialogue = HOST_SCRIPTS[6].finalResults(overallWinnerName);
        break;
      }

      case 'FINALE_FORFEIT_COMPLETE': {
        if (s.finaleState) {
          s.finaleState.forfeitCompleted = true;
        }
        break;
      }

      case 'TIMER_PLAY_PAUSE': {
        if (s.isTimerPaused) {
          if (s.timerPausedRemaining !== undefined) {
            s.timerDeadline = Date.now() + s.timerPausedRemaining;
            s.isTimerPaused = false;
            s.timerPausedRemaining = undefined;
          }
        } else {
          const remainingMs = Math.max(0, (s.timerDeadline || Date.now()) - Date.now());
          s.timerPausedRemaining = remainingMs;
          s.isTimerPaused = true;
        }
        break;
      }

      case 'TIMER_ADJUST': {
        const deltaSec = payload?.seconds || 0;
        const deltaMs = deltaSec * 1000;
        if (s.isTimerPaused && s.timerPausedRemaining !== undefined) {
          s.timerPausedRemaining = Math.max(0, s.timerPausedRemaining + deltaMs);
          s.phaseTimeRemaining = Math.round(s.timerPausedRemaining / 1000);
        } else {
          s.timerDeadline = Math.max(Date.now(), (s.timerDeadline || Date.now()) + deltaMs);
          s.phaseTimeRemaining = Math.max(0, Math.ceil((s.timerDeadline - Date.now()) / 1000));
        }
        break;
      }

      case 'DEMO_SIMULATE_VOTES': {
        if (s.isDemoRoom) {
          const pList = Object.values(room.players).filter(p => !p.isEliminated);
          pList.forEach(p => {
            if (!p.hasLockedVote) {
              const targets = pList.filter(t => t.id !== p.id);
              const target = targets[Math.floor(Math.random() * targets.length)];
              if (target) {
                p.votedForPlayerId = target.id;
                p.votedForPlayerName = target.name;
                p.hasLockedVote = true;
              }
            }
          });
          const allLocked = pList.every(p => p.hasLockedVote);
          if (allLocked) {
            if (s.phase === 'FINALE_VOTING') {
              s.phase = 'FINALE_VOTE_REVEALS';
              if (s.finaleState) s.finaleState.stage = 'VOTE_REVEALS';
            } else {
              s.phase = s.isTieRevote ? 'TIE_REVEALS' : 'VOTE_REVEALS';
            }
            s.currentRevealIndex = 0;
            s.latestDialogue = HOST_SCRIPTS[s.currentRound]?.allVotesLocked || '';
          }
        }
        break;
      }

      case 'DEMO_AUTO_SUBMIT_ALL_OBJECTS': {
        if (s.isDemoRoom && s.exhibitAState) {
          const defaultPool = [
            'Wooden Spoon',
            'Single Sock',
            'Tea Towel',
            'Screwdriver',
            'Rubber Duck',
            'Coffee Mug',
            'Candlestick',
          ];
          Object.values(room.players).forEach((p, idx) => {
            const existing = s.exhibitAState?.objects.find(o => o.contributorId === p.id);
            const objName = existing?.name?.trim()
              ? existing.name
              : defaultPool[idx] || `Curious Artifact ${idx + 1}`;
            if (existing) {
              existing.name = objName;
            } else {
              s.exhibitAState?.objects.push({
                id: `obj_${p.id}`,
                contributorId: p.id,
                contributorName: p.name,
                name: objName,
                hasPresented: false,
              });
            }
          });
        }
        break;
      }

      case 'DEMO_ACKNOWLEDGE_ALL': {
        if (s.isDemoRoom && s.exhibitAState) {
          s.exhibitAState.acknowledgedPlayerIds = Object.values(room.players).map(p => p.id);
          s.exhibitAState.stage = 'PRESENTATIONS';
        }
        break;
      }

      case 'DEMO_SIMULATE_EVIDENCE_VOTES': {
        if (s.isDemoRoom && s.exhibitAState && s.exhibitAState.objects.length > 0) {
          const objs = s.exhibitAState.objects;
          Object.values(room.players).forEach(p => {
            if (!s.exhibitAState?.evidenceVotes[p.id]) {
              const randomObj = objs[Math.floor(Math.random() * objs.length)];
              s.exhibitAState!.evidenceVotes[p.id] = randomObj.id;
            }
          });
          s.exhibitAState.isEvidenceVoteLocked = true;
        }
        break;
      }

      case 'DEMO_SIMULATE_MAJORITY_ANSWERS': {
        if (s.isDemoRoom) {
          if (!s.birthdayMajorityState) {
            const assignedQ = BIRTHDAY_MAJORITY_QUESTION_POOL[0];
            const faithfulList = Object.values(room.players).filter(p => p.id !== s.traitorId);
            const targetFaithful =
              faithfulList.length > 0
                ? faithfulList[Math.floor(Math.random() * faithfulList.length)]
                : undefined;
            s.birthdayMajorityState = {
              questions: BIRTHDAY_MAJORITY_QUESTION_POOL.slice(0, 5),
              step: 'INITIAL_ANSWERS',
              activeQuestionIndex: 0,
              initialAnswers: {},
              allInitialAnswersLocked: false,
              predictions: {},
              playerCorrectCount: {},
              traitorTargetFaithfulId: targetFaithful?.id,
              traitorTargetFaithfulName: targetFaithful?.name,
              traitorAssignedQuestionId: assignedQ?.id || 1,
              traitorAssignmentSuccess: false,
            };
          }
          const pList = Object.values(room.players);
          if (!s.birthdayMajorityState.initialAnswers) {
            s.birthdayMajorityState.initialAnswers = {};
          }

          const isAllQuestions = !!payload?.allQuestions;
          const questionsToFill = isAllQuestions
            ? s.birthdayMajorityState.questions
            : [
                s.birthdayMajorityState.questions[s.birthdayMajorityState.activeQuestionIndex || 0] ||
                  s.birthdayMajorityState.questions[0],
              ];

          questionsToFill.forEach(q => {
            const qId = q.id;
            const favoriteCandidate = pList[qId % pList.length];
            const runnerUp = pList[(qId + 2) % pList.length];

            pList.forEach((p, pIdx) => {
              if (!s.birthdayMajorityState!.initialAnswers[p.id]) {
                s.birthdayMajorityState!.initialAnswers[p.id] = {};
              }
              let choice = favoriteCandidate.name;
              if (pIdx === 4 || pIdx === 5) choice = runnerUp.name;
              else if (pIdx === 6) choice = pList[(pIdx + 3) % pList.length].name;

              s.birthdayMajorityState!.initialAnswers[p.id][qId] = choice;
              (s.birthdayMajorityState!.initialAnswers[p.id] as any)[String(qId)] = choice;
            });
          });

          recalculateMajorityResults(s, room.players);
        }
        break;
      }

      case 'DEMO_SKIP_MAJORITY_MISSION': {
        if (s.isDemoRoom) {
          if (!s.birthdayMajorityState) {
            s.birthdayMajorityState = {
              questions: BIRTHDAY_MAJORITY_QUESTION_POOL.slice(0, 5),
              step: 'INITIAL_ANSWERS',
              activeQuestionIndex: 0,
              initialAnswers: {},
              allInitialAnswersLocked: false,
              predictions: {},
              playerCorrectCount: {},
            };
          }
          const pList = Object.values(room.players);
          if (!s.birthdayMajorityState.initialAnswers) {
            s.birthdayMajorityState.initialAnswers = {};
          }

          s.birthdayMajorityState.questions.forEach(q => {
            const qId = q.id;
            const favoriteCandidate = pList[qId % pList.length];
            const runnerUp = pList[(qId + 2) % pList.length];

            pList.forEach((p, pIdx) => {
              if (!s.birthdayMajorityState!.initialAnswers[p.id]) {
                s.birthdayMajorityState!.initialAnswers[p.id] = {};
              }
              let choice = favoriteCandidate.name;
              if (pIdx === 4 || pIdx === 5) choice = runnerUp.name;
              else if (pIdx === 6) choice = pList[(pIdx + 3) % pList.length].name;

              s.birthdayMajorityState!.initialAnswers[p.id][qId] = choice;
              (s.birthdayMajorityState!.initialAnswers[p.id] as any)[String(qId)] = choice;
            });
          });

          s.birthdayMajorityState.allInitialAnswersLocked = true;
          s.birthdayMajorityState.step = 'COMPLETED';
          recalculateMajorityResults(s, room.players);

          const dialogue = getDefaultDialogue('ROUND_TABLE', s.currentRound);
          setPhaseWithTimer(s, 'ROUND_TABLE', 480, dialogue);
        }
        break;
      }

      case 'DEMO_SIMULATE_END_OR_BANISH': {
        if (s.isDemoRoom && s.finaleState) {
          const survivors = Object.values(room.players).filter(p => !p.isEliminated);
          survivors.forEach(p => {
            if (!s.finaleState?.endOrBanishChoices[p.id]) {
              s.finaleState!.endOrBanishChoices[p.id] = Math.random() > 0.5 ? 'END' : 'BANISH';
            }
          });
          s.finaleState.endOrBanishRevealed = true;
        }
        break;
      }

      case 'DEMO_JUMP_TO_ROUND': {
        if (s.isDemoRoom) {
          const targetRound = Math.min(6, Math.max(1, payload?.round || 1));
          const targetPhase: GamePhase = payload?.phase || 'INTRO';
          s.currentRound = targetRound;

          if (targetRound < 6) {
            Object.values(room.players).forEach(p => {
              p.isEliminated = false;
            });
          }

          assignSecretRoles(s, room.players);

          if (targetPhase === 'MISSION') {
            if (targetRound === 1 && s.exhibitAState) {
              const defaultPool = [
                'Antique Pocket Watch',
                'Black Leather Glove',
                'Crimson Handkerchief',
                'Ornate Brass Key',
                'Poison Decanter Flask',
                'Wax-Sealed Letter',
                'Engraved Silver Spoon',
              ];
              s.exhibitAState.objects = [];
              Object.values(room.players).forEach((p, idx) => {
                s.exhibitAState!.objects.push({
                  id: `obj_${p.id}`,
                  contributorId: p.id,
                  contributorName: p.name,
                  name: defaultPool[idx] || `Artifact ${idx + 1}`,
                  hasPresented: true,
                });
              });
              s.exhibitAState.stage = 'PRESENTATIONS';
            }
          }

          const dialogue = getDefaultDialogue(targetPhase, targetRound);
          setPhaseWithTimer(s, targetPhase, 420, dialogue);
        }
        break;
      }
    }

    this.saveRoom(room);
    return sanitizeLocalState(room.state, room.players, playerToken, isHost);
  }
}

export const localGameEngine = new LocalGameEngine();
