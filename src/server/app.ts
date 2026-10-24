import express from 'express';
import path from 'path';
import fs from 'fs';
import type {
  GamePhase,
  GameState,
  ClientGameState,
  Player,
  Role,
  SanitizedPlayer,
  RoundHistory,
  TraitorObjective,
  ExhibitAState,
  ExhibitAObject,
  BirthdayMajorityState,
  ForgeryGalleryState,
  BodyDisposalState,
  CounterfeitExpertState,
  GetawayAuctionState,
  FinaleState,
  PlayerScoreBreakdown,
} from '../types/game.ts';
import {
  TRAITOR_OBJECTIVES,
  EXHIBIT_A_EXAMPLES,
  BIRTHDAY_MAJORITY_QUESTION_POOL,
  FORGERY_BRIEF_PAIRS,
  BODY_DISPOSAL_SCENARIO,
  BODY_DISPOSAL_OBJECTS_POOL,
  COUNTERFEIT_INVENTIONS,
  AUCTION_LOTS,
} from '../data/missions.ts';
import { HOST_SCRIPTS, JASMINE_FORFEIT_APOLOGY } from '../data/dialogue.ts';
import { db } from './db.ts';

const app = express();

// Normalize incoming paths and handle Vercel serverless rewrites & CORS
app.use((req, res, next) => {
  // If originalUrl has the full /api/... path, preserve it
  if (req.originalUrl && req.originalUrl.startsWith('/api/') && req.url !== req.originalUrl) {
    req.url = req.originalUrl;
  } else if (process.env.VERCEL && req.url && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
    // Only in Vercel serverless functions where /api is stripped by routing:
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-room-code');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Persistent uploads directory for images and voice clips (if writable)
const UPLOADS_DIR = path.resolve('public/uploads');
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  app.use('/uploads', express.static(UPLOADS_DIR));
} catch {
  // Read-only filesystem in serverless environments
}

// Also support /api/uploads/:filename route for serverless static serving
app.get('/api/uploads/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const candidates = [
    path.join(path.resolve('public/uploads'), filename),
    path.join('/tmp/uploads', filename),
    path.join('/tmp', filename),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return res.sendFile(c);
    }
  }
  return res.status(404).json({ error: 'File not found' });
});

function saveBase64MediaToFile(dataUrl: string, prefix: string): string {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }
  try {
    const matches = dataUrl.match(/^data:([A-Za-z0-9-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return dataUrl;
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    let ext = 'bin';
    if (mimeType.includes('audio/webm')) ext = 'webm';
    else if (mimeType.includes('audio/mp3') || mimeType.includes('audio/mpeg')) ext = 'mp3';
    else if (mimeType.includes('audio/wav')) ext = 'wav';
    else if (mimeType.includes('audio/m4a') || mimeType.includes('audio/mp4') || mimeType.includes('audio/x-m4a')) ext = 'm4a';
    else if (mimeType.includes('audio/aac')) ext = 'aac';
    else if (mimeType.includes('audio/ogg')) ext = 'ogg';
    else if (mimeType.includes('image/png')) ext = 'png';
    else if (mimeType.includes('image/jpeg') || mimeType.includes('image/jpg')) ext = 'jpg';
    else if (mimeType.includes('image/webp')) ext = 'webp';
    else if (mimeType.includes('image/gif')) ext = 'gif';

    const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

    // On Vercel / serverless: keeping the base64 dataUrl guarantees permanent availability
    // across all lambdas and devices via Supabase and avoids ephemeral filesystem loss.
    if (process.env.VERCEL) {
      return dataUrl;
    }

    // In local or self-hosted Node, save to public/uploads
    let targetDir = UPLOADS_DIR;
    let isWritable = false;
    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.accessSync(targetDir, fs.constants.W_OK);
      isWritable = true;
    } catch {
      targetDir = '/tmp/uploads';
      try {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        isWritable = true;
      } catch {
        isWritable = false;
      }
    }

    if (isWritable) {
      const filePath = path.join(targetDir, fileName);
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);
      console.log(`Saved media file permanently: ${fileName} (${(buffer.length / 1024).toFixed(1)} KB)`);
      return `/uploads/${fileName}`;
    }
    return dataUrl;
  } catch (err) {
    console.error('Failed to save base64 media to file:', err);
    return dataUrl;
  }
}

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

const DEFAULT_OBJECTIVES: Record<number, TraitorObjective> = TRAITOR_OBJECTIVES;

async function getDialogueForPhase(phase: string, round: number): Promise<string> {
  try {
    const saved = await db.getMediaConfig();
    if (Array.isArray(saved)) {
      const scene = saved.find(
        (s: any) =>
          (s.id === `ROUND_${round}_${phase}` || (s.phase === phase && s.round === round)) && s.customText
      );
      if (scene && scene.customText) {
        return scene.customText;
      }
    }
  } catch (e) {
    console.warn('Could not read media config for dialogue:', e);
  }

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
      return '';
  }
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
      const chosen = (answers as any)[qId] || (answers as any)[String(qId)];
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

    if (maxVotes > 0 && topNames.length > 0) {
      Object.entries(initialAnswers).forEach(([pId, answers]) => {
        const chosen = (answers as any)[qId] || (answers as any)[String(qId)];
        if (chosen && topNames.includes(chosen)) {
          correctCounts[pId] = (correctCounts[pId] || 0) + 1;
        }
      });
    }
  });

  bState.questionResults = questionResults;
  bState.playerCorrectCount = correctCounts;

  if (bState.traitorTargetFaithfulId && bState.traitorAssignedQuestionId) {
    const targetAnswers = initialAnswers[bState.traitorTargetFaithfulId];
    const targetChoice = (targetAnswers as any)?.[bState.traitorAssignedQuestionId] || (targetAnswers as any)?.[String(bState.traitorAssignedQuestionId)];
    const qResult = questionResults[bState.traitorAssignedQuestionId];
    if (targetChoice && qResult && qResult.topNames.length > 0) {
      bState.traitorAssignmentSuccess = !qResult.topNames.includes(targetChoice);
    }
  }
}

function createInitialState(roomCode: string, isDemo = false): GameState {
  const initialDuration = 480; // 8 mins for opening
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
    latestDialogue: HOST_SCRIPTS[1].intro,
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

/**
 * Sanitizes game state enforcing strict privacy rules:
 * - Calling player sees ONLY their own role, secret mission, and vote.
 * - Others' roles, secret missions, and unrevealed votes are completely stripped.
 * - Exhibit A planted object is secret to Traitor only until post-banishment.
 * - Finale eliminated players' roles are strictly hidden until final reveal.
 * - Live countdown is dynamically calculated from persistent timer deadlines.
 */
function sanitizeState(
  state: GameState,
  playersMap: Record<string, Player>,
  playerToken?: string,
  isHostDisplay?: boolean
): ClientGameState {
  const s = state;
  const playersList = Object.values(playersMap);
  const callingPlayer = playerToken
    ? playersMap[playerToken] || playersList.find(p => p.id === playerToken)
    : undefined;

  const isRound1to5PostBanishment =
    s.currentRound < 6 &&
    ['BANISHMENT_OUTCOME', 'ASSIGNMENT_VERIFICATION', 'ROUND_SUMMARY'].includes(s.phase);

  const isFinalResultsRevealed =
    s.phase === 'FINAL_RESULTS' ||
    (s.phase === 'FINALE_FINAL_REVEAL' && s.finaleState?.allSurvivorsRevealed);

  // 1. Calculate live remaining time dynamically from deadline
  let liveRemaining = s.phaseTimeRemaining;
  if (s.isTimerPaused && s.timerPausedRemaining !== undefined) {
    liveRemaining = Math.max(0, Math.round(s.timerPausedRemaining / 1000));
  } else if (s.timerDeadline) {
    liveRemaining = Math.max(0, Math.ceil((s.timerDeadline - Date.now()) / 1000));
  }

  // 2. Strict player privacy sanitization
  const sanitizedPlayers: SanitizedPlayer[] = playersList.map(p => {
    const isSelf = callingPlayer?.id === p.id;
    let revealedRole: Role | undefined = undefined;

    if (
      isRound1to5PostBanishment ||
      isFinalResultsRevealed ||
      (s.phase === 'FINALE_FINAL_REVEAL' && s.finaleState?.revealedSurvivorIds.includes(p.id)) ||
      (s.phase === 'FINALE_ELIMINATION' && s.finaleState?.currentEliminatedPlayerId === p.id)
    ) {
      revealedRole = p.role;
    } else if (isSelf) {
      revealedRole = p.role;
    }

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
      isEliminated: !!p.isEliminated,
      survivedFinale: !!p.survivedFinale,
      revealedVoteForId: p.hasRevealedSlate || isRound1to5PostBanishment ? p.votedForPlayerId : undefined,
      revealedVoteForName: p.hasRevealedSlate || isRound1to5PostBanishment ? p.votedForPlayerName : undefined,
      revealedRole,
    };
  });

  const activeTurnPlayerId = s.seatingOrder[s.currentRevealIndex];
  const isMyTurnToReveal =
    !!callingPlayer &&
    callingPlayer.id === activeTurnPlayerId &&
    (s.phase === 'VOTE_REVEALS' || s.phase === 'FINALE_VOTE_REVEALS');

  const clientState: ClientGameState = {
    roomCode: s.roomCode,
    currentRound: s.currentRound,
    phase: s.phase,
    phaseTimeRemaining: liveRemaining,
    timerDurationSec: s.timerDurationSec,
    timerDeadline: s.timerDeadline,
    timerPausedRemaining: s.timerPausedRemaining,
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
    traitorId: s.isDemoRoom || isRound1to5PostBanishment || isFinalResultsRevealed ? s.traitorId : undefined,
    traitorName: s.isDemoRoom || isRound1to5PostBanishment || isFinalResultsRevealed ? s.traitorName : undefined,
  };

  // 3. Populate private calling player fields
  if (callingPlayer) {
    clientState.myPlayerId = callingPlayer.id;
    clientState.myRole = callingPlayer.role;
    clientState.myHasLockedVote = callingPlayer.hasLockedVote;
    clientState.myHasRevealedSlate = callingPlayer.hasRevealedSlate;
    clientState.myVotedForId = callingPlayer.votedForPlayerId;
    clientState.isMyTurnToReveal = isMyTurnToReveal;
    clientState.isMyEliminated = !!callingPlayer.isEliminated;

    // Dynamically resolve planted object name from objects if needed
    let resolvedPlantedObjectId = s.exhibitAState?.plantedObjectId;
    let resolvedPlantedObjectName = s.exhibitAState?.plantedObjectName;

    if (s.exhibitAState) {
      if (resolvedPlantedObjectId && !resolvedPlantedObjectName) {
        const match = s.exhibitAState.objects.find(o => o.id === resolvedPlantedObjectId);
        if (match?.name) resolvedPlantedObjectName = match.name;
      }
      if (!resolvedPlantedObjectName && s.exhibitAState.stage !== 'COLLECTION' && s.exhibitAState.objects.length > 0) {
        const nonTraitor = s.exhibitAState.objects.filter(o => o.contributorId !== s.traitorId && o.name && o.name.trim().length > 0);
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
      } else if (s.currentRound === 3) {
        const brief = s.forgeryGalleryState?.traitorBrief || 'Draw a suspicious birthday celebration scene';
        clientState.mySecretBriefing = `You are THE FORGER (TRAITOR) for Round 3! Your altered drawing brief is: "${brief}". Include a person, a setting, and 3 objects so you earn all 3 mission points, and bluff during gallery inspection that your prompt matched everyone else's!`;
      } else if (s.currentRound === 4) {
        const contraband = s.bodyDisposalState?.traitorAssignedObject || 'the contraband item';
        clientState.mySecretBriefing = `You are THE TRAITOR for Round 4 (The Body Disposal Committee). The household objects from Round 1 have returned! Your secret contraband object is: "${contraband}". Get the group to include "${contraband}" in the final 5 disposal items AND have another player fetch or champion it!`;
      } else if (s.currentRound === 5) {
        const twoWords = s.counterfeitExpertState?.traitorTwoWords?.join('", "') || 'two secret words';
        const inv = s.counterfeitExpertState?.invention || 'the invention';
        clientState.mySecretBriefing = `You are THE COUNTERFEIT EXPERT (TRAITOR) for Round 5! The invention is "${inv}". The Faithful have 3 secret words, but you only have TWO: "${twoWords}". Weave both into your 30-second pitch, listen closely to other players to deduce the missing 3rd word, and lock in your guess on your phone!`;
      } else if (s.currentRound === 6) {
        const targetName = s.getawayAuctionState?.traitorTargetFaithfulName || 'your target Faithful';
        clientState.mySecretBriefing = `You are THE FINAL TRAITOR for Round 6 & The Finale! Secret Auction Mission: Sabotage "${targetName}" by bidding them up so they spend all 12 coins or finish the auction with fewer than 2 Escape Points (+2 pts). Then survive the final banishments to steal the entire game victory outright!`;
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
      } else if (s.currentRound === 3) {
        const brief = s.forgeryGalleryState?.faithfulBrief || 'Draw the official birthday commission';
        clientState.mySecretBriefing = `You are FAITHFUL for Round 3 (The Forgery Gallery). Your official commission brief is: "${brief}". Draw a person, a setting, and 3 clear objects (+3 pts). One player received a subtly different Forger's brief—spot the fake when drawings are held up!`;
      } else if (s.currentRound === 4) {
        clientState.mySecretBriefing =
          'You are FAITHFUL for Round 4 (The Body Disposal Committee). The household objects from Round 1 are back on the table! As a group, select exactly 5 objects and weave all 5 into a 60-second disposal alibi (+3 pts). Watch out: the Traitor is secretly trying to sneak one specific contraband item into the final 5!';
      } else if (s.currentRound === 5) {
        const threeWords = s.counterfeitExpertState?.faithfulThreeWords?.join('", "') || 'three secret words';
        const inv = s.counterfeitExpertState?.invention || 'the invention';
        clientState.mySecretBriefing = `You are FAITHFUL for Round 5 (The Counterfeit Expert). The invention is "${inv}". Your THREE mandatory secret words are: "${threeWords}". Casually slip them into your 30-second pitch without making them obvious (+3 pts)—the Traitor only knows two of them and is listening to steal the third!`;
      } else if (s.currentRound === 6) {
        clientState.mySecretBriefing =
          'You are FAITHFUL for Round 6 and the Grand Finale. Spend your 12 coins wisely in the Getaway Auction (every 2 Escape Points = +1 mission pt, up to 3 pts). From this moment, if you are banished, you are permanently eliminated. Catch the Traitor so the highest-scoring surviving Faithful wins!';
      } else {
        clientState.mySecretBriefing = `You are FAITHFUL for Round ${s.currentRound}. Sworn to protect Libby's birthday honour! One player among you is lying. Watch who deflects and who steers the group.`;
      }
    }
  }

  // 4. Reveal secrets only post-banishment
  if (isRound1to5PostBanishment || isFinalResultsRevealed) {
    clientState.revealedTraitorId = s.traitorId || undefined;
    clientState.revealedTraitorName = s.traitorName || undefined;
    clientState.revealedTraitorObjective = s.traitorObjective || undefined;
    if (s.exhibitAState?.plantedObjectName) {
      clientState.revealedPlantedObjectName = s.exhibitAState.plantedObjectName;
    }
  }

  // 5. Mission States Sanitization (Zero-Spoiler for Host TV & App Creator)
  const isTraitorCaller = callingPlayer?.id === s.traitorId;
  const isSecretRevealed = isRound1to5PostBanishment || isFinalResultsRevealed;

  if (s.exhibitAState) {
    const isRevealed = isSecretRevealed || s.currentRound > 1;
    const finalPlantedId = s.exhibitAState.plantedObjectId || (s.exhibitAState.stage !== 'COLLECTION' ? s.exhibitAState.objects[0]?.id : undefined);
    const finalPlantedName = s.exhibitAState.plantedObjectName || (finalPlantedId ? s.exhibitAState.objects.find(o => o.id === finalPlantedId)?.name : undefined);

    clientState.exhibitAState = {
      ...s.exhibitAState,
      plantedObjectId: isTraitorCaller || isRevealed ? finalPlantedId : undefined,
      plantedObjectName: isTraitorCaller || isRevealed ? finalPlantedName : undefined,
    };
  }

  if (s.birthdayMajorityState) {
    clientState.birthdayMajorityState = {
      ...s.birthdayMajorityState,
      traitorTargetFaithfulId: isTraitorCaller || isSecretRevealed ? s.birthdayMajorityState.traitorTargetFaithfulId : undefined,
      traitorTargetFaithfulName: isTraitorCaller || isSecretRevealed ? s.birthdayMajorityState.traitorTargetFaithfulName : undefined,
      traitorAssignedQuestionId: isTraitorCaller || isSecretRevealed ? s.birthdayMajorityState.traitorAssignedQuestionId : undefined,
    };
  }

  if (s.forgeryGalleryState) {
    const isFaithfulCaller = callingPlayer?.role === 'FAITHFUL';
    clientState.forgeryGalleryState = {
      ...s.forgeryGalleryState,
      faithfulBrief:
        isFaithfulCaller || isSecretRevealed || s.forgeryGalleryState.isDrawingLocked
          ? s.forgeryGalleryState.faithfulBrief
          : 'Secret Brief Sent to Faithful Phones (Hidden until Lock)',
      traitorBrief:
        isTraitorCaller || isSecretRevealed
          ? s.forgeryGalleryState.traitorBrief
          : 'Secret Altered Brief Sent to Forger Phone (Hidden until Banishment)',
    };
  }

  if (s.bodyDisposalState) {
    clientState.bodyDisposalState = {
      ...s.bodyDisposalState,
      traitorAssignedObject:
        isTraitorCaller || isSecretRevealed
          ? s.bodyDisposalState.traitorAssignedObject
          : 'SECRET CONTRABAND ITEM',
    };
  }

  if (s.counterfeitExpertState) {
    const isFaithfulCaller = callingPlayer?.role === 'FAITHFUL';
    clientState.counterfeitExpertState = {
      ...s.counterfeitExpertState,
      faithfulThreeWords:
        isFaithfulCaller || isSecretRevealed
          ? s.counterfeitExpertState.faithfulThreeWords
          : [
              s.counterfeitExpertState.traitorTwoWords[0] || '???',
              s.counterfeitExpertState.traitorTwoWords[1] || '???',
              '??? (Hidden 3rd Word)',
            ],
      missingThirdWord:
        isFaithfulCaller || isSecretRevealed
          ? s.counterfeitExpertState.missingThirdWord
          : '???',
    };
  }

  if (s.getawayAuctionState) {
    clientState.getawayAuctionState = {
      ...s.getawayAuctionState,
      traitorTargetFaithfulId:
        isTraitorCaller || isSecretRevealed ? s.getawayAuctionState.traitorTargetFaithfulId : undefined,
      traitorTargetFaithfulName:
        isTraitorCaller || isSecretRevealed ? s.getawayAuctionState.traitorTargetFaithfulName : undefined,
    };
  }
  if (s.finaleState) clientState.finaleState = s.finaleState;

  return clientState;
}

function assignSecretRoles(s: GameState, playersMap: Record<string, Player>) {
  const players = Object.values(playersMap);
  if (players.length === 0) return;

  // Assign roles independently each round
  const traitorIndex = Math.floor(Math.random() * players.length);
  const traitorPlayer = players[traitorIndex];
  const roundNum = s.currentRound;
  const objective = { ...(DEFAULT_OBJECTIVES[roundNum] || DEFAULT_OBJECTIVES[1]) };

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

  // Reset missions for round with full runtime randomization (so app creator has zero spoilers)
  if (roundNum === 1) {
    const existingObjects = s.exhibitAState?.objects && s.exhibitAState.objects.length > 0 ? s.exhibitAState.objects : [];
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
    const targetFaithful = faithfulList.length > 0 ? faithfulList[Math.floor(Math.random() * faithfulList.length)] : undefined;
    const questions = BIRTHDAY_MAJORITY_QUESTION_POOL.slice(0, 5);
    const assignedQ = questions[Math.floor(Math.random() * questions.length)] || questions[0];

    s.birthdayMajorityState = {
      questions,
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
      traitorPlayer.secretMission = `The Deliberate Detour: Your secret target Faithful is "${targetFaithful.name}". On Question ${assignedQ?.id || 1} ("${assignedQ?.prompt}"), convince them to vote for someone other than the room's majority consensus!`;
      s.traitorObjective = {
        ...objective,
        description: `Steer ${targetFaithful.name} away from the majority answer on Question #${assignedQ?.id || 1}.`,
      };
    }
  } else if (roundNum === 3) {
    // Randomly select a pair AND 50/50 coin-flip which brief is Faithful vs Traitor
    const randomPair = FORGERY_BRIEF_PAIRS[Math.floor(Math.random() * FORGERY_BRIEF_PAIRS.length)];
    const flip = Math.random() < 0.5;
    const faithfulBrief = flip ? randomPair.faithful : randomPair.traitor;
    const traitorBrief = flip ? randomPair.traitor : randomPair.faithful;

    s.forgeryGalleryState = {
      faithfulBrief,
      traitorBrief,
      qualifiedMilestones: {},
      isDrawingLocked: false,
      forgerAccusations: {},
    };

    if (traitorPlayer) {
      traitorPlayer.secretMission = `The Forger's Commission: Your secret drawing brief is "${traitorBrief}". Draw a person, a setting, and 3 objects (+3 pts) while blending in with the Faithful gallery!`;
      s.traitorObjective = {
        ...objective,
        description: `Completed Forger's brief ("${traitorBrief}") without exposing the altered prompt.`,
      };
    }
  } else if (roundNum === 4) {
    // Continuity: Carry over household objects submitted in Round 1 (Exhibit A)!
    const round1Objects = (s.exhibitAState?.objects || [])
      .map(o => o.name?.trim())
      .filter((n): n is string => !!n && n.length > 0);

    const combinedPool = [...round1Objects];
    for (const fallbackItem of BODY_DISPOSAL_OBJECTS_POOL) {
      if (combinedPool.length >= 7) break;
      if (!combinedPool.some(existing => existing.toLowerCase() === fallbackItem.toLowerCase())) {
        combinedPool.push(fallbackItem);
      }
    }
    const confirmedItems = combinedPool.slice(0, Math.max(7, round1Objects.length));
    const randomContraband =
      confirmedItems[Math.floor(Math.random() * confirmedItems.length)] || BODY_DISPOSAL_OBJECTS_POOL[0];

    s.bodyDisposalState = {
      scenario: BODY_DISPOSAL_SCENARIO,
      confirmedHouseholdItems: confirmedItems,
      carriedOverFromRound1: round1Objects.length > 0,
      traitorAssignedObject: randomContraband,
      chosenFiveObjects: [],
      milestones: {
        fiveObjectsChosen: false,
        allFiveInStory: false,
        presentationUnderOneMinute: false,
      },
    };

    if (traitorPlayer) {
      traitorPlayer.secretMission = `The Planted Contraband: Your secret contraband item from the table is "${randomContraband}". Ensure "${randomContraband}" is chosen among the group's 5 disposal objects AND get another player to champion or fetch it!`;
      s.traitorObjective = {
        ...objective,
        description: `Ensure "${randomContraband}" is included in the 5 chosen disposal items.`,
      };
    }
  } else if (roundNum === 5) {
    // Randomly pick an invention and randomly draw 3 words from candidateWords (and hide 1 at random)
    const inv = COUNTERFEIT_INVENTIONS[Math.floor(Math.random() * COUNTERFEIT_INVENTIONS.length)];
    const pool = inv.candidateWords && inv.candidateWords.length >= 4
      ? [...inv.candidateWords]
      : [...inv.faithfulThreeWords, ' Pendulum', ' Crankshaft', ' Bellows'].map(w => w.trim());

    // Shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const chosenThree: [string, string, string] = [pool[0], pool[1], pool[2]];
    const missingIdx = Math.floor(Math.random() * 3);
    const missingThirdWord = chosenThree[missingIdx];
    const traitorTwo = chosenThree.filter((_, idx) => idx !== missingIdx) as [string, string];

    // Shuffle candidateWords for multiple-choice display on Traitor phone
    const candidateOptions = [...pool];
    for (let i = candidateOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidateOptions[i], candidateOptions[j]] = [candidateOptions[j], candidateOptions[i]];
    }

    s.counterfeitExpertState = {
      invention: inv.invention,
      candidateWords: candidateOptions,
      faithfulThreeWords: chosenThree,
      traitorTwoWords: traitorTwo,
      missingThirdWord,
      speakingOrder: s.seatingOrder,
      playerMilestones: {},
      traitorGuessedWord: undefined,
      traitorGuessedWordSuccess: false,
    };

    if (traitorPlayer) {
      traitorPlayer.secretMission = `The Missing Jargon: For "${inv.invention}", your 2 known words are "${traitorTwo[0]}" and "${traitorTwo[1]}". Use them in your pitch, listen to the Faithful to identify the hidden 3rd word, and lock in your guess on your phone!`;
      s.traitorObjective = {
        ...objective,
        description: `Identify the hidden 3rd word ("${missingThirdWord}") for "${inv.invention}".`,
      };
    }
  } else if (roundNum === 6) {
    const coinBalances: Record<string, number> = {};
    players.forEach(p => {
      coinBalances[p.id] = 12;
    });
    const faithfulList = players.filter(p => p.id !== traitorPlayer.id);
    const targetFaithful =
      faithfulList.length > 0 ? faithfulList[Math.floor(Math.random() * faithfulList.length)] : undefined;

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
      traitorTargetFaithfulId: targetFaithful?.id,
      traitorTargetFaithfulName: targetFaithful?.name,
      traitorAssignmentSuccess: false,
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

    if (traitorPlayer && targetFaithful) {
      traitorPlayer.secretMission = `The Poisoned Bid: Sabotage "${targetFaithful.name}" during the Getaway Auction so they finish with fewer than 2 Escape Points or spend all 12 coins early (+2 pts). Then survive the Finale banishments to win the entire game outright!`;
      s.traitorObjective = {
        ...objective,
        description: `Sabotage ${targetFaithful.name} in the Getaway Auction (< 2 Escape Pts or 0 coins left).`,
      };
    }
  }
}

/**
 * REVISED SCORING FOR ALL SIX ROUNDS:
 * Maximum 6 points per round (Total max: 36 points across 6 rounds)
 * 1. MISSION PERFORMANCE: 0 to 3 points
 * 2. PERSONAL OBJECTIVE:
 *    - Faithful: 2 pts if their first banishment ballot identified the Traitor
 *    - Traitor: 2 pts if secret assignment succeeded
 * 3. ROUND OUTCOME:
 *    - Faithful: 1 pt if the group banishes the Traitor
 *    - Traitor: 1 pt if Traitor survives banishment
 */
function recalculateCumulativeScores(s: GameState, playersMap: Record<string, Player>) {
  const players = Object.values(playersMap);
  players.forEach(p => {
    let total = 0;
    let lastRound = 0;
    s.roundHistory
      .sort((a, b) => a.roundNumber - b.roundNumber)
      .forEach(h => {
        const pts = h.roundScores?.[p.id] ?? h.scoreBreakdown?.[p.id]?.totalRoundPoints ?? 0;
        total += pts;
        lastRound = pts;
      });
    p.score = total;
    p.lastRoundScore = lastRound;
  });
}

function recordRoundOutcome(
  s: GameState,
  playersMap: Record<string, Player>,
  banishedId: string | null,
  wasTraitor: boolean
) {
  // Replace existing history entry for this round if re-evaluated, or push new
  s.roundHistory = s.roundHistory.filter(h => h.roundNumber !== s.currentRound);

  const players = Object.values(playersMap);
  const traitor = players.find(p => p.id === s.traitorId);
  const banished = banishedId ? players.find(p => p.id === banishedId) : null;
  const roundScores: Record<string, number> = {};
  const scoreBreakdown: Record<string, PlayerScoreBreakdown> = {};
  const ballotMap: Record<string, string> = {};

  let traitorAssignmentCompleted = false;

  // Check Traitor assignment success per round:
  if (s.currentRound === 1 && s.exhibitAState) {
    traitorAssignmentCompleted =
      !!s.exhibitAState.plantedObjectId &&
      s.exhibitAState.plantedObjectId === s.exhibitAState.winningObjectId;
  } else if (s.currentRound === 2 && s.birthdayMajorityState) {
    traitorAssignmentCompleted = !!s.birthdayMajorityState.traitorAssignmentSuccess;
  } else if (s.currentRound === 3 && s.forgeryGalleryState) {
    const tMs = s.traitorId ? s.forgeryGalleryState.qualifiedMilestones?.[s.traitorId] : undefined;
    traitorAssignmentCompleted = !!(tMs?.person && tMs?.setting && tMs?.threeObjects) || !wasTraitor;
  } else if (s.currentRound === 4 && s.bodyDisposalState) {
    traitorAssignmentCompleted =
      s.bodyDisposalState.chosenFiveObjects.includes(s.bodyDisposalState.traitorAssignedObject) ||
      !!s.bodyDisposalState.traitorObjectFetchedByOther;
  } else if (s.currentRound === 5 && s.counterfeitExpertState) {
    traitorAssignmentCompleted = !!s.counterfeitExpertState.traitorGuessedWordSuccess;
  } else if (s.currentRound === 6 && s.getawayAuctionState) {
    const targetId = s.getawayAuctionState.traitorTargetFaithfulId;
    const targetEsc = targetId ? (s.getawayAuctionState.playerEscapePoints?.[targetId] || 0) : 0;
    const targetCoins = targetId ? (s.getawayAuctionState.playerCoins?.[targetId] ?? 12) : 12;
    traitorAssignmentCompleted =
      !!s.getawayAuctionState.traitorAssignmentSuccess ||
      (!!targetId && (targetEsc < 2 || targetCoins === 0));
  }

  players.forEach(p => {
    if (p.votedForPlayerId) {
      ballotMap[p.id] = p.votedForPlayerId;
    }

    // 1. Mission Points (0 to 3)
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

    // 2. Personal Objective (0 or 2)
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

    // 3. Round Outcome (0 or 1)
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
    firstBallotVotes: ballotMap,
    scoreBreakdown,
    roundScores,
    exhibitAPlantedObjectName: s.exhibitAState?.plantedObjectName,
    exhibitAWon: s.exhibitAState?.winningObjectId === s.exhibitAState?.plantedObjectId,
  };

  s.roundHistory.push(history);
  recalculateCumulativeScores(s, playersMap);
}

// ----------------------------------------------------
// REST API Endpoints (Vercel Serverless & Local Node)
// ----------------------------------------------------

// Gatekeeper Passcode Verification
app.all(['/api/auth/verify-passcode', '/auth/verify-passcode'], (req, res) => {
  // Extract password from body (POST) or query (GET)
  const rawEntered = req.body?.password || req.body?.passcode || req.query?.password || req.query?.pwd || req.query?.passcode;
  if (!rawEntered || typeof rawEntered !== 'string') {
    return res.status(400).json({ success: false, error: 'Passcode is required.' });
  }

  // Clean entered password (strip surrounding quotes, whitespace, convert to lowercase)
  const entered = rawEntered.trim().replace(/^["']|["']$/g, '').toLowerCase();

  // Environment-configured password (support various casing & trim quotes)
  const envPasswordRaw =
    process.env.CASTLE_PASSWORD ||
    process.env.castle_password ||
    process.env.Castle_Password ||
    '';
  const configured = envPasswordRaw.trim().replace(/^["']|["']$/g, '').toLowerCase();

  // Accepted party passcodes:
  // 1. Configured password from environment (e.g. Jeremy, Libby, custom)
  // 2. Official celebration passcodes so hosts and guests are never locked out
  const accepted = new Set<string>();
  if (configured) {
    accepted.add(configured);
  }
  accepted.add('libby');
  accepted.add('jeremy');
  accepted.add('castle');
  accepted.add('traitors');
  accepted.add('traitor');
  accepted.add('merlot');

  if (accepted.has(entered)) {
    return res.json({ success: true, message: 'Passcode verified' });
  }

  return res.status(401).json({
    success: false,
    error: 'Incorrect castle passcode. Access denied.',
  });
});

// Admin Media Storage & Uploads
app.post('/api/admin/upload-media', (req, res) => {
  try {
    const { dataUrl, type, fileName: originalName, sceneId } = req.body;
    if (!dataUrl) {
      return res.status(400).json({ success: false, error: 'No dataUrl provided' });
    }
    const prefix = `${type || 'media'}_${sceneId || 'asset'}`;
    const url = saveBase64MediaToFile(dataUrl, prefix);
    res.json({ success: true, url, fileName: originalName || path.basename(url) });
  } catch (err: any) {
    console.error('Failed to upload media:', err);
    res.status(500).json({ success: false, error: 'Failed to process media upload' });
  }
});

// Direct Workspace Asset Uploader (/public/assets/aistudio) for bulk audio & image drops
app.post('/api/admin/upload-to-workspace', (req, res) => {
  try {
    const { files } = req.body as {
      files?: Array<{ fileName: string; dataUrl: string }>;
    };
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files provided' });
    }

    const targetDir = path.resolve('public/assets/aistudio');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const savedFiles: Array<{ originalName: string; savedName: string; url: string }> = [];

    for (const item of files) {
      if (!item?.dataUrl || !item?.fileName) continue;
      const matches = item.dataUrl.match(/^data:([A-Za-z0-9-+/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) continue;

      const base64Data = matches[2];
      const safeName = item.fileName
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_');
      const fullPath = path.join(targetDir, safeName);
      fs.writeFileSync(fullPath, Buffer.from(base64Data, 'base64'));
      savedFiles.push({
        originalName: item.fileName,
        savedName: safeName,
        url: `/assets/aistudio/${safeName}`,
      });
    }

    res.json({
      success: true,
      count: savedFiles.length,
      savedFiles,
    });
  } catch (err: any) {
    console.error('Failed to save workspace files:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to save workspace files' });
  }
});

app.get('/api/admin/workspace-assets', (_req, res) => {
  try {
    const targetDir = path.resolve('public/assets/aistudio');
    if (!fs.existsSync(targetDir)) {
      return res.json({ success: true, files: [] });
    }
    const files = fs.readdirSync(targetDir).filter(f => !f.startsWith('.'));
    res.json({ success: true, files });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to list workspace files' });
  }
});

app.get('/api/admin/media', async (req, res) => {
  try {
    const media = await db.getMediaConfig();
    res.json({ success: true, media: media || [] });
  } catch (err: any) {
    console.error('Failed to get media config:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve media config' });
  }
});

app.post('/api/admin/media', async (req, res) => {
  try {
    const rawScenes = req.body;
    if (Array.isArray(rawScenes)) {
      // In serverless, preserve dataUrls directly for complete persistence across cold starts
      const processed = rawScenes.map((scene: any) => {
        const clean = { ...scene };
        if (clean.customImageUrl && typeof clean.customImageUrl === 'string' && clean.customImageUrl.startsWith('data:')) {
          clean.customImageUrl = saveBase64MediaToFile(clean.customImageUrl, `img_${clean.id}`);
        }
        if (clean.voiceClip && clean.voiceClip.audioUrl && typeof clean.voiceClip.audioUrl === 'string' && clean.voiceClip.audioUrl.startsWith('data:')) {
          clean.voiceClip = {
            ...clean.voiceClip,
            audioUrl: saveBase64MediaToFile(clean.voiceClip.audioUrl, `audio_${clean.id}`),
          };
        }
        return clean;
      });
      await db.saveMediaConfig(processed);
      return res.json({ success: true, message: 'Media configuration saved.', media: processed });
    }
    await db.saveMediaConfig(rawScenes);
    res.json({ success: true, message: 'Media configuration saved.' });
  } catch (err: any) {
    console.error('Failed to write media config:', err);
    res.status(500).json({ success: false, error: 'Failed to write media config.' });
  }
});

app.post('/api/admin/media/reset', async (req, res) => {
  try {
    await db.resetMediaConfig();
    res.json({ success: true, message: 'Media configuration reset.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to reset media config.' });
  }
});

// Create new room
app.post('/api/rooms', async (req, res) => {
  try {
    const hostName = (req.body?.hostName || 'Libby').trim() || 'Libby';
    const code = generateRoomCode();
    const playerToken = generateId('token_');
    const playerId = generateId('p_');

    const creatorPlayer: Player = {
      id: playerId,
      name: hostName,
      isRoomCreator: true,
      seatNumber: 1,
      connected: true,
      score: 0,
    };

    const state = createInitialState(code);
    state.seatingOrder = [playerId];
    try {
      state.latestDialogue = await getDialogueForPhase('INTRO', 1);
    } catch {
      state.latestDialogue = HOST_SCRIPTS[1]?.intro || 'Welcome to Jasmine’s Castle. Trust absolutely nobody.';
    }

    const players: Record<string, Player> = {
      [playerToken]: creatorPlayer,
    };

    await db.saveRoom({
      code,
      creatorToken: playerToken,
      state,
      players,
    });

    res.json({
      roomCode: code,
      playerToken,
      playerId,
      name: hostName,
      seatNumber: 1,
      isRoomCreator: true,
      state: sanitizeState(state, players, playerToken, true),
    });
  } catch (err: any) {
    console.error('Error creating room in /api/rooms:', err);
    res.status(500).json({ error: err?.message || 'Failed to create room' });
  }
});

// Join room
app.post('/api/rooms/:code/join', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const room = await db.getRoom(code);
    if (!room) {
      return res.status(404).json({ error: 'Castle room not found.' });
    }

    const existingToken = req.body?.playerToken;
    if (existingToken && room.players[existingToken]) {
      const existingPlayer = room.players[existingToken];
      existingPlayer.connected = true;
      await db.saveRoom(room);
      return res.json({
        roomCode: code,
        playerToken: existingToken,
        playerId: existingPlayer.id,
        name: existingPlayer.name,
        seatNumber: existingPlayer.seatNumber,
        isRoomCreator: !!existingPlayer.isRoomCreator,
        state: sanitizeState(room.state, room.players, existingToken, !!existingPlayer.isRoomCreator),
      });
    }

    const playersList = Object.values(room.players || {});

    let name = (req.body?.name || '').trim();
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

    const newPlayer: Player = {
      id: newPlayerId,
      name,
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
    await db.saveRoom(room);

    res.json({
      roomCode: code,
      playerToken: newToken,
      playerId: newPlayerId,
      name,
      seatNumber,
      isRoomCreator: false,
      state: sanitizeState(room.state, room.players, newToken, false),
    });
  } catch (err: any) {
    console.error(`Error in /api/rooms/${req.params.code}/join:`, err);
    res.status(500).json({ error: err?.message || 'Failed to join castle room' });
  }
});

// Helper to initialize or re-seed the 7-player Instant Demo Castle
async function setupDemoCastleRoom() {
  const code = 'DEMO7';
  const creatorToken = 'demo_token_libby';
  const state = createInitialState(code, true);
  try {
    state.latestDialogue = await getDialogueForPhase('INTRO', 1);
  } catch {
    state.latestDialogue = HOST_SCRIPTS[1].intro;
  }

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

  const record = {
    code,
    creatorToken,
    state,
    players,
  };

  try {
    await db.saveRoom(record);
  } catch (err) {
    console.warn('Non-fatal error persisting DEMO7 room to database:', err);
  }

  return record;
}

// Seed Instant Demo Castle handler
const handleDemoSetup = async (req: express.Request, res: express.Response) => {
  try {
    const record = await setupDemoCastleRoom();
    res.json({
      roomCode: record.code,
      playerToken: record.creatorToken,
      playerId: 'p_libby',
      message: 'Demo Castle created with 7 seated players.',
      state: sanitizeState(record.state, record.players, record.creatorToken, true),
    });
  } catch (err: any) {
    console.error('Demo setup handler caught error, providing fallback response:', err);
    res.json({
      roomCode: 'DEMO7',
      playerToken: 'demo_token_libby',
      playerId: 'p_libby',
      message: 'Demo Castle created with 7 seated players.',
    });
  }
};

app.post('/api/rooms/demo-setup', handleDemoSetup);
app.get('/api/rooms/demo-setup', handleDemoSetup);
app.all(['/rooms/demo-setup', '/api/demo/setup', '/demo/setup', '/api/demo-setup'], handleDemoSetup);

// Get current state snapshot
app.get('/api/rooms/:code/state', async (req, res) => {
  const code = req.params.code.toUpperCase();
  let room = await db.getRoom(code);
  if (!room && code === 'DEMO7') {
    room = await setupDemoCastleRoom();
  }
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const playerToken = (req.query.playerToken as string) || '';
  const isHost = req.query.isHost === 'true';

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json(sanitizeState(room.state, room.players, playerToken, isHost));
});

// Perform game action
app.post('/api/rooms/:code/action', async (req, res) => {
  const code = req.params.code.toUpperCase();
  let room = await db.getRoom(code);
  if (!room && code === 'DEMO7') {
    room = await setupDemoCastleRoom();
  }
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const { action, payload, playerToken } = req.body;
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
          const found = Object.values(room.players).find(p => p.id === pId);
          if (found) found.seatNumber = idx + 1;
        });
      }
      break;
    }

    case 'START_GAME': {
      const dialogue = await getDialogueForPhase('INTRO', s.currentRound);
      setPhaseWithTimer(s, 'INTRO', 480, dialogue); // 8 mins opening
      break;
    }

    case 'ADVANCE_TO_ROLE_BRIEFING': {
      assignSecretRoles(s, room.players);
      const dialogue = await getDialogueForPhase('ROLE_BRIEFING', s.currentRound);
      setPhaseWithTimer(s, 'ROLE_BRIEFING', 60, dialogue);
      break;
    }

    case 'ADVANCE_TO_MISSION': {
      if (s.currentRound === 2 && !s.birthdayMajorityState) {
        const assignedQ = BIRTHDAY_MAJORITY_QUESTION_POOL[0];
        const faithfulList = Object.values(room.players).filter(p => p.id !== s.traitorId);
        const targetFaithful = faithfulList.length > 0 ? faithfulList[Math.floor(Math.random() * faithfulList.length)] : undefined;
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
      const dialogue = await getDialogueForPhase('MISSION', s.currentRound);
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

      // Ensure roles are assigned if not yet set
      if (!s.traitorId) {
        assignSecretRoles(s, room.players);
      }

      // Ensure every seated player has a named object registered
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

      // Prefer objects submitted by players other than the Traitor with valid names
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

      // Randomly select one object from the inputted objects
      const selected = eligibleObjects[Math.floor(Math.random() * eligibleObjects.length)];
      s.exhibitAState.plantedObjectId = selected.id;
      s.exhibitAState.plantedObjectName = selected.name;

      // Update Traitor's private briefing and secret mission
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

      if (tiedObjIds.length === 0 && s.exhibitAState.objects.length > 0) {
        tiedObjIds = [s.exhibitAState.plantedObjectId || s.exhibitAState.objects[0].id];
      }

      if (tiedObjIds.length > 1 && !s.exhibitAState.isEvidenceTieRevote && !payload?.forceResolve) {
        s.exhibitAState.isEvidenceTieRevote = true;
        s.exhibitAState.tiedObjectIds = tiedObjIds;
        s.exhibitAState.evidenceVoteRevealed = true;
        const leadObj = s.exhibitAState.objects.find(o => o.id === tiedObjIds[0]) || s.exhibitAState.objects[0];
        if (leadObj) {
          s.exhibitAState.winningObjectId = leadObj.id;
          s.exhibitAState.winningObjectName = leadObj.name;
          s.exhibitAState.winningObjectContributorName = leadObj.contributorName;
        }
        s.exhibitAState.stage = 'EVIDENCE_REVEAL';
      } else if (tiedObjIds.length >= 1) {
        // Prefer planted object if tied on final revote, otherwise first tied object
        const winnerId =
          tiedObjIds.find(id => id === s.exhibitAState?.plantedObjectId) || tiedObjIds[0];
        const winObj =
          s.exhibitAState.objects.find(o => o.id === winnerId) || s.exhibitAState.objects[0];
        s.exhibitAState.isEvidenceTieRevote = false;
        s.exhibitAState.winningObjectId = winObj?.id || winnerId;
        s.exhibitAState.winningObjectName = winObj?.name || 'Mystery Object';
        s.exhibitAState.winningObjectContributorName = winObj?.contributorName || 'Castle Guest';
        s.exhibitAState.evidenceVoteRevealed = true;
        s.exhibitAState.stage = 'EVIDENCE_REVEAL';
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
      const { questionId, chosenName } = payload;
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
      const targetPId = payload?.playerId || player?.id;
      const { milestone, value } = payload;
      if (!targetPId) break;
      if (!s.forgeryGalleryState.qualifiedMilestones[targetPId]) {
        s.forgeryGalleryState.qualifiedMilestones[targetPId] = {
          person: false,
          setting: false,
          threeObjects: false,
        };
      }
      if (milestone in s.forgeryGalleryState.qualifiedMilestones[targetPId]) {
        (s.forgeryGalleryState.qualifiedMilestones[targetPId] as any)[milestone] = !!value;
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
        s.bodyDisposalState.milestones.fiveObjectsChosen = payload.chosenFiveObjects.length === 5;
      }
      if (payload?.milestones) {
        s.bodyDisposalState.milestones = {
          ...s.bodyDisposalState.milestones,
          ...payload.milestones,
        };
      }
      if (typeof payload?.traitorObjectFetchedByOther === 'boolean') {
        s.bodyDisposalState.traitorObjectFetchedByOther = payload.traitorObjectFetchedByOther;
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
      const { milestone, value } = payload;
      if (milestone in s.bodyDisposalState.milestones) {
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
      const targetPId = payload?.playerId || player?.id;
      const { milestone, value } = payload;
      if (!targetPId) break;
      if (!s.counterfeitExpertState.playerMilestones[targetPId]) {
        s.counterfeitExpertState.playerMilestones[targetPId] = {
          under30Seconds: false,
          word1Used: false,
          word2Used: false,
          word3Attempted: false,
        };
      }
      if (milestone in s.counterfeitExpertState.playerMilestones[targetPId]) {
        (s.counterfeitExpertState.playerMilestones[targetPId] as any)[milestone] = !!value;
      }
      break;
    }

    case 'COUNTERFEIT_TRAITOR_GUESS_WORD': {
      if (!s.counterfeitExpertState) break;
      const guessedWord = (payload?.guessedWord || '').trim();
      if (!guessedWord) break;
      s.counterfeitExpertState.traitorGuessedWord = guessedWord;
      s.counterfeitExpertState.traitorGuessedWordSuccess =
        guessedWord.toLowerCase() === s.counterfeitExpertState.missingThirdWord.trim().toLowerCase();
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
      const dialogue = await getDialogueForPhase('ROUND_TABLE', s.currentRound);
      setPhaseWithTimer(s, 'ROUND_TABLE', 480, dialogue); // 8 mins round table
      break;
    }

    case 'ADVANCE_TO_VOTING': {
      const dialogue = await getDialogueForPhase('VOTING', s.currentRound);
      setPhaseWithTimer(s, 'VOTING', 120, dialogue); // 2 mins voting
      Object.values(room.players).forEach(p => {
        p.hasLockedVote = false;
        p.hasRevealedSlate = false;
        p.votedForPlayerId = undefined;
        p.votedForPlayerName = undefined;
      });
      break;
    }

    case 'LOCK_VOTE': {
      const actingPlayer =
        (s.isDemoRoom && payload?.voterPlayerId
          ? Object.values(room.players).find(p => p.id === payload.voterPlayerId)
          : null) || player;
      if (!actingPlayer) break;
      const targetId = payload?.targetPlayerId;
      if (!targetId || targetId === actingPlayer.id) {
        return res.status(400).json({ error: 'Cannot vote for yourself' });
      }
      const target = Object.values(room.players).find(p => p.id === targetId);
      if (!target) {
        return res.status(400).json({ error: 'Target player not found' });
      }

      actingPlayer.votedForPlayerId = target.id;
      actingPlayer.votedForPlayerName = target.name;
      actingPlayer.hasLockedVote = true;

      // Auto-transition to VOTE_REVEALS once all votes locked
      const allLocked = Object.values(room.players).every(p => p.hasLockedVote);
      if (allLocked) {
        s.phase = s.isTieRevote ? 'TIE_REVEALS' : 'VOTE_REVEALS';
        s.currentRevealIndex = 0;
        s.latestDialogue = HOST_SCRIPTS[s.currentRound].allVotesLocked;
      }
      break;
    }

    case 'REVEAL_ALL_SLATES': {
      if (s.phase === 'VOTE_REVEALS' || s.phase === 'TIE_REVEALS') {
        Object.values(room.players).forEach(p => {
          p.hasRevealedSlate = true;
        });
        s.currentRevealIndex = s.seatingOrder.length;

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
              cId => Object.values(room.players).find(p => p.id === cId)?.name || 'Guest'
            );
            setPhaseWithTimer(s, 'TIE_DEFENCE', 60, HOST_SCRIPTS[s.currentRound].tieOccurred(candidateNames));
          } else {
            s.isTieRevote = false;
            s.phase = 'BANISHMENT_OUTCOME';
            s.latestDialogue = HOST_SCRIPTS[s.currentRound].tieBanishmentFailed;
            recordRoundOutcome(s, room.players, null, false);
          }
        } else if (candidatesWithMax.length === 1) {
          s.isTieRevote = false;
          const banishedId = candidatesWithMax[0];
          const banishedPlayer = Object.values(room.players).find(p => p.id === banishedId);
          const wasTraitor = banishedId === s.traitorId;
          s.phase = 'BANISHMENT_OUTCOME';
          s.latestDialogue = HOST_SCRIPTS[s.currentRound].banishment(
            banishedPlayer?.name || 'Someone',
            wasTraitor
          );
          recordRoundOutcome(s, room.players, banishedId, wasTraitor);
        }
      } else if (s.phase === 'FINALE_VOTE_REVEALS' || s.phase === 'FINALE_TIE_REVEALS') {
        if (!s.finaleState) break;
        const activeSurvivors = s.seatingOrder.filter(
          id => !Object.values(room.players).find(p => p.id === id)?.isEliminated
        );
        Object.values(room.players)
          .filter(p => !p.isEliminated)
          .forEach(p => {
            p.hasRevealedSlate = true;
          });
        s.currentRevealIndex = activeSurvivors.length;

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
          s.latestDialogue = HOST_SCRIPTS[6].banishment(banishedPlayer?.name || 'Someone', false);
        }
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

      // All slates revealed -> tally votes!
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
            // First tie -> Tie defence
            s.isTieRevote = true;
            s.tieCandidateIds = candidatesWithMax;
            s.phase = 'TIE_DEFENCE';
            const candidateNames = candidatesWithMax.map(
              cId => Object.values(room.players).find(p => p.id === cId)?.name || 'Guest'
            );
            setPhaseWithTimer(s, 'TIE_DEFENCE', 60, HOST_SCRIPTS[s.currentRound].tieOccurred(candidateNames));
          } else {
            // Second tie in revote -> No banishment occurs
            s.isTieRevote = false;
            s.phase = 'BANISHMENT_OUTCOME';
            s.latestDialogue = HOST_SCRIPTS[s.currentRound].tieBanishmentFailed;
            recordRoundOutcome(s, room.players, null, false);
          }
        } else if (candidatesWithMax.length === 1) {
          s.isTieRevote = false;
          const banishedId = candidatesWithMax[0];
          const banishedPlayer = Object.values(room.players).find(p => p.id === banishedId);
          const wasTraitor = banishedId === s.traitorId;
          s.phase = 'BANISHMENT_OUTCOME';
          s.latestDialogue = HOST_SCRIPTS[s.currentRound].banishment(
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
        }
      }
      recalculateCumulativeScores(s, room.players);
      s.phase = 'ROUND_SUMMARY';
      break;
    }

    case 'ADVANCE_NEXT_ROUND': {
      if (s.currentRound < 5) {
        s.currentRound += 1;
        const dialogue = await getDialogueForPhase('INTRO', s.currentRound);
        setPhaseWithTimer(s, 'INTRO', 60, dialogue);
      } else if (s.currentRound === 5) {
        // Advance to Round 6 (Auction & Finale)
        s.currentRound = 6;
        const dialogue = await getDialogueForPhase('INTRO', 6);
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
      if (!s.getawayAuctionState) break;
      const actingPlayer =
        (s.isDemoRoom && payload?.targetPlayerId
          ? Object.values(room.players).find(p => p.id === payload.targetPlayerId)
          : null) || player;
      if (!actingPlayer) break;
      const { lotNumber, bid } = payload;
      const maxCoins = s.getawayAuctionState.playerCoins[actingPlayer.id] ?? 12;
      const cleanBid = Math.max(0, Math.min(maxCoins, Number(bid) || 0));
      if (!s.getawayAuctionState.bids[lotNumber]) {
        s.getawayAuctionState.bids[lotNumber] = {};
      }
      s.getawayAuctionState.bids[lotNumber][actingPlayer.id] = cleanBid;

      // If all players have submitted a sealed bid for this lot, auto-resolve highest bidder
      const allPlayers = Object.values(room.players);
      if (Object.keys(s.getawayAuctionState.bids[lotNumber]).length >= allPlayers.length) {
        let highestBid = -1;
        let topBidderIds: string[] = [];
        Object.entries(s.getawayAuctionState.bids[lotNumber]).forEach(([pId, bAmount]) => {
          if (bAmount > highestBid) {
            highestBid = bAmount;
            topBidderIds = [pId];
          } else if (bAmount === highestBid) {
            topBidderIds.push(pId);
          }
        });
        if (topBidderIds.length >= 1 && highestBid > 0) {
          const winnerId = topBidderIds[0];
          const winner = allPlayers.find(p => p.id === winnerId);
          const lot = s.getawayAuctionState.lots.find(l => l.lotNumber === lotNumber);
          if (winner && lot) {
            s.getawayAuctionState.lotWinners[lotNumber] = {
              winnerId,
              winnerName: winner.name,
              winningBid: highestBid,
            };
            s.getawayAuctionState.playerCoins[winnerId] = Math.max(
              0,
              (s.getawayAuctionState.playerCoins[winnerId] ?? 12) - highestBid
            );
            s.getawayAuctionState.playerEscapePoints[winnerId] =
              (s.getawayAuctionState.playerEscapePoints[winnerId] ?? 0) + lot.escapePoints;
            if (!s.getawayAuctionState.purchasedLots[winnerId]) {
              s.getawayAuctionState.purchasedLots[winnerId] = [];
            }
            if (!s.getawayAuctionState.purchasedLots[winnerId].includes(lotNumber)) {
              s.getawayAuctionState.purchasedLots[winnerId].push(lotNumber);
            }
          }
        }
      }
      break;
    }

    case 'RESOLVE_AUCTION_LOT': {
      if (!s.getawayAuctionState) break;
      const { lotNumber, winnerId, winningBid } = payload;
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
        if (!s.getawayAuctionState.purchasedLots[winnerId].includes(lotNumber)) {
          s.getawayAuctionState.purchasedLots[winnerId].push(lotNumber);
        }
      }

      // Check Traitor assignment success dynamically
      const targetId = s.getawayAuctionState.traitorTargetFaithfulId;
      if (targetId) {
        const targetEsc = s.getawayAuctionState.playerEscapePoints[targetId] || 0;
        const targetCoins = s.getawayAuctionState.playerCoins[targetId] ?? 12;
        s.getawayAuctionState.traitorAssignmentSuccess = targetEsc < 2 || targetCoins === 0;
      }

      // If last lot (lot 6), transition to finale auction recap without revealing traitor
      if (lotNumber === 6) {
        s.phase = 'FINALE_AUCTION_RECAP';
        s.latestDialogue =
          'The auction is over. Your money has gone. Your Traitor hasn’t. From this moment, if you’re banished, you’re finished.';
      } else {
        // Advance to next lot automatically if desired
        const nextLotIdx = s.getawayAuctionState.lots.findIndex(l => l.lotNumber === lotNumber) + 1;
        if (nextLotIdx > 0 && nextLotIdx < s.getawayAuctionState.lots.length) {
          s.getawayAuctionState.currentLotIndex = nextLotIdx;
        }
      }
      break;
    }

    case 'DEMO_SIMULATE_AUCTION': {
      if (!s.getawayAuctionState) break;
      const pList = Object.values(room.players);
      s.getawayAuctionState.lots.forEach((lot, idx) => {
        if (!s.getawayAuctionState!.lotWinners[lot.lotNumber]) {
          const winner = pList[idx % pList.length];
          const avail = s.getawayAuctionState!.playerCoins[winner.id] ?? 12;
          const bid = Math.min(avail, Math.max(2, lot.escapePoints + 1));
          s.getawayAuctionState!.lotWinners[lot.lotNumber] = {
            winnerId: winner.id,
            winnerName: winner.name,
            winningBid: bid,
          };
          s.getawayAuctionState!.playerCoins[winner.id] = Math.max(0, avail - bid);
          s.getawayAuctionState!.playerEscapePoints[winner.id] =
            (s.getawayAuctionState!.playerEscapePoints[winner.id] ?? 0) + lot.escapePoints;
          if (!s.getawayAuctionState!.purchasedLots[winner.id]) {
            s.getawayAuctionState!.purchasedLots[winner.id] = [];
          }
          if (!s.getawayAuctionState!.purchasedLots[winner.id].includes(lot.lotNumber)) {
            s.getawayAuctionState!.purchasedLots[winner.id].push(lot.lotNumber);
          }
        }
      });
      const targetId = s.getawayAuctionState.traitorTargetFaithfulId;
      if (targetId) {
        const targetEsc = s.getawayAuctionState.playerEscapePoints[targetId] || 0;
        const targetCoins = s.getawayAuctionState.playerCoins[targetId] ?? 12;
        s.getawayAuctionState.traitorAssignmentSuccess = targetEsc < 2 || targetCoins === 0;
      }
      s.getawayAuctionState.currentLotIndex = 5;
      break;
    }

    case 'CONCLUDE_AUCTION_TO_FINALE': {
      s.phase = 'FINALE_AUCTION_RECAP';
      s.latestDialogue =
        'The auction is over. Your money has gone. Your Traitor hasn’t. From this moment, if you’re banished, you’re finished.';
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
        HOST_SCRIPTS[6].roundTable
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
        HOST_SCRIPTS[6].votingOpen
      );

      // Reset votes for active non-eliminated players
      Object.values(room.players).forEach(p => {
        p.hasLockedVote = false;
        p.hasRevealedSlate = false;
        p.votedForPlayerId = undefined;
        p.votedForPlayerName = undefined;
      });
      break;
    }

    case 'FINALE_LOCK_VOTE': {
      if (!s.finaleState || !player || player.isEliminated) {
        return res.status(401).json({ error: 'Eliminated players cannot vote' });
      }
      const targetId = payload?.targetPlayerId;
      if (!targetId || targetId === player.id) {
        return res.status(400).json({ error: 'Cannot vote for yourself' });
      }
      const target = Object.values(room.players).find(p => p.id === targetId);
      if (!target || target.isEliminated) {
        return res.status(400).json({ error: 'Target player not eligible' });
      }

      player.votedForPlayerId = target.id;
      player.votedForPlayerName = target.name;
      player.hasLockedVote = true;

      // Record very first finale vote for Faithful scoring
      if (s.finaleState.cycleNumber === 1 && !s.finaleState.firstBanishmentVotes[player.id]) {
        s.finaleState.firstBanishmentVotes[player.id] = target.id;
      }

      const activeSurvivors = Object.values(room.players).filter(p => !p.isEliminated);
      const allLocked = activeSurvivors.every(p => p.hasLockedVote);
      if (allLocked) {
        s.phase = 'FINALE_VOTE_REVEALS';
        s.finaleState.stage = 'VOTE_REVEALS';
        s.currentRevealIndex = 0;
        s.latestDialogue = HOST_SCRIPTS[6].allVotesLocked;
      }
      break;
    }

    case 'FINALE_FINISH_SLATE': {
      if (!s.finaleState) break;
      const activeSurvivors = s.seatingOrder.filter(
        id => !Object.values(room.players).find(p => p.id === id)?.isEliminated
      );
      const activePlayerId = activeSurvivors[s.currentRevealIndex];
      const revealingPlayer = Object.values(room.players).find(p => p.id === activePlayerId);

      if (revealingPlayer) {
        revealingPlayer.hasRevealedSlate = true;
        s.latestDialogue = `${revealingPlayer.name} has pointed the finger at ${revealingPlayer.votedForPlayerName}.`;
      }

      s.currentRevealIndex += 1;

      if (s.currentRevealIndex >= activeSurvivors.length) {
        // Tally votes among active survivors
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
            // Still tied revote -> No banishment! Does NOT count towards 3 eliminations. Resume discussion.
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
          s.latestDialogue = HOST_SCRIPTS[6].banishment(banishedPlayer?.name || 'Someone', false);
        }
      }
      break;
    }

    case 'FINALE_NEXT_CYCLE': {
      if (!s.finaleState) break;
      const remainingSurvivors = Object.values(room.players).filter(p => !p.isEliminated);

      if (remainingSurvivors.length > 4) {
        // Next elimination cycle
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
        // Proceed to END or BANISH decision
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
      } else if (remainingSurvivors.length <= 3) {
        // 3 or fewer survivors -> proceed to END_OR_BANISH if 3, or auto-end if <= 2
        if (remainingSurvivors.length === 3 && !s.finaleState.endOrBanishRevealed) {
          s.phase = 'FINALE_END_OR_BANISH';
          s.finaleState.stage = 'END_OR_BANISH';
          s.finaleState.endOrBanishChoices = {};
          s.finaleState.endOrBanishRevealed = false;
          setPhaseWithTimer(
            s,
            'FINALE_END_OR_BANISH',
            120,
            'Final Three. Each survivor must privately choose: END THE GAME or BANISH AGAIN.'
          );
        } else {
          s.phase = 'FINALE_FINAL_REVEAL';
          s.finaleState.stage = 'FINAL_REVEAL';
          s.finaleState.revealedSurvivorIds = [];
          s.finaleState.currentSurvivorRevealIndex = 0;
        }
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

        if (allEnd || survivors.length <= 2) {
          // Unanimous END -> proceed to Final Reveal!
          s.phase = 'FINALE_FINAL_REVEAL';
          s.finaleState.stage = 'FINAL_REVEAL';
          s.finaleState.revealedSurvivorIds = [];
          s.finaleState.currentSurvivorRevealIndex = 0;
        } else {
          // At least one BANISH -> hold another discussion and banishment
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

      // Award Round 6 Points
      const round6Scores: Record<string, number> = {};
      const round6Breakdown: Record<string, PlayerScoreBreakdown> = {};

      const targetId = s.getawayAuctionState?.traitorTargetFaithfulId;
      const targetEsc = targetId ? (s.getawayAuctionState?.playerEscapePoints?.[targetId] || 0) : 0;
      const targetCoins = targetId ? (s.getawayAuctionState?.playerCoins?.[targetId] ?? 12) : 12;
      const traitorAuctionSuccess =
        !!s.getawayAuctionState?.traitorAssignmentSuccess ||
        (!!targetId && (targetEsc < 2 || targetCoins === 0));

      playersList.forEach(p => {
        // 1. Mission Points (0 to 3) from Auction escape points
        const esc = s.getawayAuctionState?.playerEscapePoints?.[p.id] || 0;
        const missionPoints = Math.min(3, Math.max(0, Math.floor(esc / 2)));

        // 2. Personal Objective (0 or 2)
        let personalObjectivePoints = 0;
        if (p.role === 'FAITHFUL') {
          if (s.finaleState?.firstBanishmentVotes[p.id] === s.traitorId) {
            personalObjectivePoints = 2;
          }
        } else if (p.role === 'TRAITOR') {
          if (traitorAuctionSuccess) {
            personalObjectivePoints = 2;
          }
        }

        // 3. Round Outcome (0 or 1)
        let roundOutcomePoints = 0;
        if (p.role === 'FAITHFUL') {
          if (!isTraitorAlive) {
            roundOutcomePoints = 1;
          }
        } else if (p.role === 'TRAITOR') {
          if (isTraitorAlive) {
            roundOutcomePoints = 1;
          }
        }

        const totalRound6 = missionPoints + personalObjectivePoints + roundOutcomePoints;
        round6Scores[p.id] = totalRound6;
        round6Breakdown[p.id] = {
          missionPoints,
          personalObjectivePoints,
          roundOutcomePoints,
          totalRoundPoints: totalRound6,
        };
      });

      // Replace or append round 6 in history and recalculate cumulative scores
      s.roundHistory = s.roundHistory.filter(h => h.roundNumber !== 6);
      s.roundHistory.push({
        roundNumber: 6,
        traitorId: s.traitorId || '',
        traitorName: traitor?.name || 'Unknown',
        banishedPlayerId: s.finaleState.eliminatedPlayerIds.join(','),
        banishedPlayerName: null,
        wasTraitorBanished: !isTraitorAlive,
        traitorAssignmentCompleted: traitorAuctionSuccess,
        firstBallotVotes: s.finaleState.firstBanishmentVotes,
        scoreBreakdown: round6Breakdown,
        roundScores: round6Scores,
      });
      recalculateCumulativeScores(s, room.players);

      // Overall Winner Determination:
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

      // Loser Determination: Lowest completed six-round score across all 7 players
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

    // Timer actions
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

    // Demo auto-simulate
    case 'DEMO_SIMULATE_VOTES': {
      const pList = Object.values(room.players).filter(p => !p.isEliminated);
      if (pList.length > 1) {
        // Pick a primary suspect (either the Traitor 60% of the time or another guest) so we get a decisive majority
        const suspectPool = s.isTieRevote && s.tieCandidateIds.length > 0
          ? pList.filter(p => s.tieCandidateIds.includes(p.id))
          : pList;
        const primarySuspect =
          suspectPool.find(p => p.id === s.traitorId && Math.random() < 0.65) ||
          suspectPool[Math.floor(Math.random() * suspectPool.length)] ||
          pList[0];

        pList.forEach((p, idx) => {
          if (!p.hasLockedVote) {
            const validTargets = pList.filter(t => t.id !== p.id);
            let chosenTarget = primarySuspect.id !== p.id ? primarySuspect : validTargets[0];
            // Give 1 or 2 dissenting votes for realism while preserving a clear majority
            if (idx === pList.length - 1 && validTargets.length > 1) {
              chosenTarget = validTargets.find(t => t.id !== primarySuspect.id) || validTargets[0];
            }
            if (chosenTarget) {
              p.votedForPlayerId = chosenTarget.id;
              p.votedForPlayerName = chosenTarget.name;
              p.hasLockedVote = true;
              if (s.phase === 'FINALE_VOTING' && s.finaleState && s.finaleState.cycleNumber === 1) {
                s.finaleState.firstBanishmentVotes[p.id] = chosenTarget.id;
              }
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
          s.latestDialogue = HOST_SCRIPTS[s.currentRound].allVotesLocked;
        }
      }
      break;
    }

    case 'DEMO_AUTO_SUBMIT_ALL_OBJECTS': {
      if (s.exhibitAState) {
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
          const objName = existing?.name?.trim() ? existing.name : (defaultPool[idx] || `Curious Artifact ${idx + 1}`);
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
      if (s.exhibitAState) {
        s.exhibitAState.acknowledgedPlayerIds = Object.values(room.players).map(p => p.id);
        s.exhibitAState.stage = 'PRESENTATIONS';
      }
      break;
    }

    case 'DEMO_SIMULATE_EVIDENCE_VOTES': {
      if (s.exhibitAState) {
        if (s.exhibitAState.objects.length === 0) {
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
            s.exhibitAState!.objects.push({
              id: `obj_${p.id}`,
              contributorId: p.id,
              contributorName: p.name,
              name: defaultPool[idx] || `Artifact ${idx + 1}`,
              hasPresented: true,
            });
          });
        }
        const objs = s.exhibitAState.objects;
        // Pick a decisive winning object (either the planted object or another contender) so it never gets stuck in a tie
        const plantedObj = objs.find(o => o.id === s.exhibitAState?.plantedObjectId);
        const majorityObj = (plantedObj && Math.random() < 0.6) ? plantedObj : objs[0];
        const runnerUpObj = objs.find(o => o.id !== majorityObj.id) || majorityObj;

        Object.values(room.players).forEach((p, idx) => {
          const pick = idx < 5 ? majorityObj : runnerUpObj;
          s.exhibitAState!.evidenceVotes[p.id] = pick.id;
          const playerObj = s.exhibitAState!.objects.find(o => o.contributorId === p.id);
          if (playerObj) playerObj.hasPresented = true;
        });

        s.exhibitAState.isEvidenceVoteLocked = true;
        s.exhibitAState.isEvidenceTieRevote = false;
        s.exhibitAState.winningObjectId = majorityObj.id;
        s.exhibitAState.winningObjectName = majorityObj.name;
        s.exhibitAState.winningObjectContributorName = majorityObj.contributorName;
        s.exhibitAState.evidenceVoteRevealed = true;
        s.exhibitAState.stage = 'EVIDENCE_REVEAL';
      }
      break;
    }

    case 'DEMO_SIMULATE_MAJORITY_ANSWERS': {
      if (!s.birthdayMajorityState) {
        const assignedQ = BIRTHDAY_MAJORITY_QUESTION_POOL[0];
        const faithfulList = Object.values(room.players).filter(p => p.id !== s.traitorId);
        const targetFaithful = faithfulList.length > 0 ? faithfulList[Math.floor(Math.random() * faithfulList.length)] : undefined;
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
        : [s.birthdayMajorityState.questions[s.birthdayMajorityState.activeQuestionIndex || 0] || s.birthdayMajorityState.questions[0]];

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
      break;
    }

    case 'DEMO_SKIP_MAJORITY_MISSION': {
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

      const dialogue = await getDialogueForPhase('ROUND_TABLE', s.currentRound);
      setPhaseWithTimer(s, 'ROUND_TABLE', 480, dialogue);
      break;
    }

    case 'DEMO_SIMULATE_END_OR_BANISH': {
      if (s.finaleState) {
        const survivors = Object.values(room.players).filter(p => !p.isEliminated);
        survivors.forEach(p => {
          if (!s.finaleState?.endOrBanishChoices[p.id]) {
            s.finaleState!.endOrBanishChoices[p.id] = 'END';
          }
        });
        s.finaleState.endOrBanishRevealed = true;
        s.phase = 'FINALE_FINAL_REVEAL';
        s.finaleState.stage = 'FINAL_REVEAL';
        s.finaleState.revealedSurvivorIds = [];
        s.finaleState.currentSurvivorRevealIndex = 0;
      }
      break;
    }

    case 'DEMO_JUMP_TO_ROUND': {
      if (s.isDemoRoom) {
        const targetRound = Math.min(6, Math.max(1, payload?.round || 1));
        const targetPhase: GamePhase = payload?.phase || 'INTRO';
        s.currentRound = targetRound;

        // Reset elimination for demo testing unless jumping to finale post-auction
        if (targetRound < 6 || targetPhase === 'INTRO' || targetPhase === 'ROLE_BRIEFING' || targetPhase === 'MISSION') {
          Object.values(room.players).forEach(p => {
            p.isEliminated = false;
          });
        }

        // Ensure Round 1 objects exist so Round 4 continuity always works even when jumping rounds in Demo Mode
        if (!s.exhibitAState || !s.exhibitAState.objects || s.exhibitAState.objects.length === 0) {
          const defaultPool = [
            'Antique Pocket Watch',
            'Black Leather Glove',
            'Crimson Handkerchief',
            'Ornate Brass Key',
            'Poison Decanter Flask',
            'Wax-Sealed Letter',
            'Engraved Silver Spoon',
          ];
          const demoObjs: ExhibitAObject[] = Object.values(room.players).map((p, idx) => ({
            id: `obj_${p.id}`,
            contributorId: p.id,
            contributorName: p.name,
            name: defaultPool[idx] || `Artifact ${idx + 1}`,
            hasPresented: true,
          }));
          s.exhibitAState = {
            stage: 'COMPLETED',
            objects: demoObjs,
            isListLocked: true,
            acknowledgedPlayerIds: Object.values(room.players).map(p => p.id),
            evidenceVotes: {},
            isEvidenceVoteLocked: true,
            evidenceVoteRevealed: true,
            isEvidenceTieRevote: false,
            tiedObjectIds: [],
          };
        }

        // Backfill previous rounds in s.roundHistory if jumping ahead so cumulative leaderboard scores carry forward!
        s.roundHistory = s.roundHistory.filter(h => h.roundNumber < targetRound);
        const playersList = Object.values(room.players);
        for (let r = 1; r < targetRound; r++) {
          if (!s.roundHistory.some(h => h.roundNumber === r)) {
            const simTraitor = playersList[r % playersList.length];
            const simBanished = playersList[(r + 1) % playersList.length];
            const wasCaught = r % 2 === 1;
            const roundScores: Record<string, number> = {};
            const scoreBreakdown: Record<string, PlayerScoreBreakdown> = {};
            const firstBallotVotes: Record<string, string> = {};

            playersList.forEach((p, idx) => {
              const mPts = 2 + ((r + idx) % 2); // 2 or 3 pts
              const pPts = (idx + r) % 2 === 0 ? 2 : 0;
              const oPts = p.id === simTraitor.id ? (wasCaught ? 0 : 1) : (wasCaught ? 1 : 0);
              const total = mPts + pPts + oPts;
              roundScores[p.id] = total;
              scoreBreakdown[p.id] = {
                missionPoints: mPts,
                personalObjectivePoints: pPts,
                roundOutcomePoints: oPts,
                totalRoundPoints: total,
              };
              firstBallotVotes[p.id] = pPts > 0 ? simTraitor.id : simBanished.id;
            });

            s.roundHistory.push({
              roundNumber: r,
              traitorId: simTraitor.id,
              traitorName: simTraitor.name,
              banishedPlayerId: wasCaught ? simTraitor.id : simBanished.id,
              banishedPlayerName: wasCaught ? simTraitor.name : simBanished.name,
              wasTraitorBanished: wasCaught,
              traitorAssignmentCompleted: !wasCaught,
              firstBallotVotes,
              scoreBreakdown,
              roundScores,
            });
          }
        }
        recalculateCumulativeScores(s, room.players);

        assignSecretRoles(s, room.players);

        // Pre-fill mission requirements if jumping straight to MISSION
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
            if (s.exhibitAState.objects.length === 0) {
              Object.values(room.players).forEach((p, idx) => {
                s.exhibitAState!.objects.push({
                  id: `obj_${p.id}`,
                  contributorId: p.id,
                  contributorName: p.name,
                  name: defaultPool[idx] || `Artifact ${idx + 1}`,
                  hasPresented: true,
                });
              });
            }
            const eligible = s.exhibitAState.objects.filter(o => o.contributorId !== s.traitorId);
            const planted = eligible[0] || s.exhibitAState.objects[0];
            if (planted) {
              s.exhibitAState.plantedObjectId = planted.id;
              s.exhibitAState.plantedObjectName = planted.name;
            }
            s.exhibitAState.isListLocked = true;
            s.exhibitAState.stage = 'PRESENTATIONS';
          }
        }

        const dialogue = await getDialogueForPhase(targetPhase, targetRound);
        setPhaseWithTimer(s, targetPhase, 420, dialogue);
      }
      break;
    }
  }

  await db.saveRoom(room);
  const isHostReq = !!req.body?.isHost || !playerToken || playerToken === room.creatorToken;
  res.json({
    success: true,
    phase: s.phase,
    state: sanitizeState(room.state, room.players, playerToken, isHostReq),
  });
});

export default app;
