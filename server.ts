import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  GamePhase,
  GameState,
  ClientGameState,
  Player,
  Role,
  SanitizedPlayer,
  RoundHistory,
  TraitorObjective,
  CastleHeistState,
  BirthdayMajorityState,
  ForgeryGalleryState,
  BodyDisposalState,
  CounterfeitExpertState,
  GetawayAuctionState,
} from './src/types/game.js';
import {
  TRAITOR_OBJECTIVES,
  HEIST_HOUSEHOLD_ITEMS_POOL,
  HEIST_STAGES,
  BIRTHDAY_MAJORITY_QUESTION_POOL,
  FORGERY_BRIEF_PAIRS,
  BODY_DISPOSAL_SCENARIO,
  BODY_DISPOSAL_OBJECTS_POOL,
  COUNTERFEIT_INVENTIONS,
  AUCTION_LOTS,
} from './src/data/missions.js';
import { HOST_SCRIPTS } from './src/data/dialogue.js';

const app = express();
const server = http.createServer(app);
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// In-memory room store
interface InternalRoom {
  code: string;
  creatorToken: string;
  players: Map<string, Player>; // token -> Player
  state: GameState;
  sseClients: Map<string, { res: express.Response; playerToken?: string; isHost?: boolean }>;
  timerInterval?: NodeJS.Timeout;
}

const rooms = new Map<string, InternalRoom>();

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


function createInitialState(roomCode: string, isDemo = false): GameState {
  return {
    roomCode,
    currentRound: 1,
    phase: 'LOBBY',
    phaseTimeRemaining: 600,
    isTimerPaused: false,
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
    castleHeistState: {
      currentStage: 1,
      confirmedHouseholdItems: HEIST_HOUSEHOLD_ITEMS_POOL.slice(0, 5),
      targetObjectForTraitor: HEIST_HOUSEHOLD_ITEMS_POOL[0],
      qualifyingPlayers: { 1: [], 2: [], 3: [] },
      stageVotes: { 1: {}, 2: {}, 3: {} },
      stageFavorites: {},
    },
  };
}

function broadcastState(room: InternalRoom) {
  room.sseClients.forEach((client, clientId) => {
    try {
      const sanitized = sanitizeState(room, client.playerToken, client.isHost);
      client.res.write(`data: ${JSON.stringify(sanitized)}\n\n`);
    } catch (e) {
      console.warn(`Failed writing SSE to ${clientId}`, e);
    }
  });
}

function sanitizeState(room: InternalRoom, playerToken?: string, isHostDisplay?: boolean): ClientGameState {
  const s = room.state;
  const playersList = Array.from(room.players.values());

  const callingPlayer = playerToken ? room.players.get(playerToken) : undefined;
  const isPostBanishment = [
    'BANISHMENT_OUTCOME',
    'ASSIGNMENT_VERIFICATION',
    'ROUND_SUMMARY',
    'FINAL_RESULTS',
  ].includes(s.phase);

  const sanitizedPlayers: SanitizedPlayer[] = playersList.map(p => {
    const isSelf = callingPlayer?.id === p.id;
    return {
      id: p.id,
      name: p.name,
      seatNumber: p.seatNumber,
      connected: p.connected,
      score: p.score,
      isRoomCreator: !!p.isRoomCreator,
      hasLockedVote: !!p.hasLockedVote,
      hasRevealedSlate: !!p.hasRevealedSlate,
      revealedVoteForId: p.hasRevealedSlate || isPostBanishment ? p.votedForPlayerId : undefined,
      revealedVoteForName: p.hasRevealedSlate || isPostBanishment ? p.votedForPlayerName : undefined,
      revealedRole: isPostBanishment || isSelf ? p.role : undefined,
    };
  });

  const activeTurnPlayerId = s.seatingOrder[s.currentRevealIndex];
  const isMyTurnToReveal = !!callingPlayer && callingPlayer.id === activeTurnPlayerId && s.phase === 'VOTE_REVEALS';

  const clientState: ClientGameState = {
    roomCode: s.roomCode,
    currentRound: s.currentRound,
    phase: s.phase,
    phaseTimeRemaining: s.phaseTimeRemaining,
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
  };

  if (callingPlayer) {
    clientState.myPlayerId = callingPlayer.id;
    clientState.myRole = callingPlayer.role;
    clientState.myHasLockedVote = callingPlayer.hasLockedVote;
    clientState.myHasRevealedSlate = callingPlayer.hasRevealedSlate;
    clientState.myVotedForId = callingPlayer.votedForPlayerId;
    clientState.isMyTurnToReveal = isMyTurnToReveal;

    if (callingPlayer.role === 'TRAITOR') {
      clientState.mySecretMission = callingPlayer.secretMission;
      clientState.mySecretBriefing = `You are THE TRAITOR for Round ${s.currentRound}. The castle is yours to deceive. Maintain your composure and fulfill your secret assignment.`;
    } else if (callingPlayer.role === 'FAITHFUL') {
      clientState.mySecretBriefing = `You are FAITHFUL for Round ${s.currentRound}. Sworn to protect Libby's birthday honour! One player among you is lying. Watch who deflects and who steers the group.`;
    }
  }

  // Reveal traitor identity and assignment only post-banishment
  if (isPostBanishment) {
    clientState.revealedTraitorId = s.traitorId || undefined;
    clientState.revealedTraitorName = s.traitorName || undefined;
    clientState.revealedTraitorObjective = s.traitorObjective || undefined;
  }

  // Safe mission states
  if (s.castleHeistState) {
    clientState.castleHeistState = s.castleHeistState;
  }
  if (s.birthdayMajorityState) {
    clientState.birthdayMajorityState = s.birthdayMajorityState;
  }
  if (s.forgeryGalleryState) {
    clientState.forgeryGalleryState = s.forgeryGalleryState;
  }
  if (s.bodyDisposalState) {
    clientState.bodyDisposalState = s.bodyDisposalState;
  }
  if (s.counterfeitExpertState) {
    clientState.counterfeitExpertState = s.counterfeitExpertState;
  }
  if (s.getawayAuctionState) {
    clientState.getawayAuctionState = s.getawayAuctionState;
  }


  return clientState;
}

function startRoomTicker(room: InternalRoom) {
  if (room.timerInterval) clearInterval(room.timerInterval);
  room.timerInterval = setInterval(() => {
    if (!room.state.isTimerPaused && room.state.phaseTimeRemaining > 0) {
      room.state.phaseTimeRemaining -= 1;
      // Broadcast state update every 5 seconds or when under 10 seconds
      if (room.state.phaseTimeRemaining % 5 === 0 || room.state.phaseTimeRemaining <= 10) {
        broadcastState(room);
      }
    }
  }, 1000);
}

function assignSecretRoles(room: InternalRoom) {
  const players = Array.from(room.players.values());
  if (players.length === 0) return;

  // Pick 1 random Traitor, 6 Faithful
  const traitorIndex = Math.floor(Math.random() * players.length);
  const traitorPlayer = players[traitorIndex];
  const roundNum = room.state.currentRound;
  const objective = DEFAULT_OBJECTIVES[roundNum] || DEFAULT_OBJECTIVES[1];

  players.forEach((p, idx) => {
    if (idx === traitorIndex) {
      p.role = 'TRAITOR';
      p.secretMission = `${objective.title}: ${objective.description} Goal: ${objective.conversationalGoal}`;
    } else {
      p.role = 'FAITHFUL';
      p.secretMission = undefined;
    }
    p.hasLockedVote = false;
    p.hasRevealedSlate = false;
    p.votedForPlayerId = undefined;
    p.votedForPlayerName = undefined;
  });

  room.state.traitorId = traitorPlayer.id;
  room.state.traitorName = traitorPlayer.name;
  room.state.traitorObjective = objective;
  room.state.currentRevealIndex = 0;
  room.state.isTieRevote = false;
  room.state.tieCandidateIds = [];

  // Reset missions for round
  if (roundNum === 1) {
    room.state.castleHeistState = {
      currentStage: 1,
      confirmedHouseholdItems: HEIST_HOUSEHOLD_ITEMS_POOL.slice(0, 5),
      targetObjectForTraitor: HEIST_HOUSEHOLD_ITEMS_POOL[0],
      qualifyingPlayers: { 1: [], 2: [], 3: [] },
      stageVotes: { 1: {}, 2: {}, 3: {} },
      stageFavorites: {},
    };
  } else if (roundNum === 2) {
    room.state.birthdayMajorityState = {
      questions: BIRTHDAY_MAJORITY_QUESTION_POOL.slice(0, 5),
      step: 'INITIAL_ANSWERS',
      activeQuestionIndex: 0,
      initialAnswers: {},
      allInitialAnswersLocked: false,
      predictions: {},
      playerCorrectCount: {},
    };
  } else if (roundNum === 3) {
    const pair = FORGERY_BRIEF_PAIRS[(roundNum - 1) % FORGERY_BRIEF_PAIRS.length];
    room.state.forgeryGalleryState = {
      faithfulBrief: pair.faithful,
      traitorBrief: pair.traitor,
      qualifiedMilestones: {},
      isDrawingLocked: false,
    };
  } else if (roundNum === 4) {
    room.state.bodyDisposalState = {
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
    room.state.counterfeitExpertState = {
      invention: inv.invention,
      faithfulThreeWords: inv.faithfulThreeWords,
      traitorTwoWords: inv.traitorTwoWords,
      missingThirdWord: inv.missingThirdWord,
      speakingOrder: room.state.seatingOrder,
      playerMilestones: {},
    };
  } else if (roundNum === 6) {
    const coinBalances: Record<string, number> = {};
    players.forEach(p => {
      coinBalances[p.id] = 12;
    });
    room.state.getawayAuctionState = {
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
  }
}

// REST API Endpoints

// Create new room
app.post('/api/rooms', (req, res) => {
  const hostName = req.body.hostName || 'Libby';
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

  const room: InternalRoom = {
    code,
    creatorToken: playerToken,
    players: new Map([[playerToken, creatorPlayer]]),
    state: createInitialState(code),
    sseClients: new Map(),
  };

  room.state.seatingOrder = [playerId];
  rooms.set(code, room);
  startRoomTicker(room);

  res.json({
    roomCode: code,
    playerToken,
    playerId,
    isRoomCreator: true,
  });
});

// Join room
app.post('/api/rooms/:code/join', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Castle room not found.' });
  }

  const existingToken = req.body.playerToken;
  if (existingToken && room.players.has(existingToken)) {
    const existingPlayer = room.players.get(existingToken)!;
    existingPlayer.connected = true;
    broadcastState(room);
    return res.json({
      roomCode: code,
      playerToken: existingToken,
      playerId: existingPlayer.id,
      name: existingPlayer.name,
      seatNumber: existingPlayer.seatNumber,
      isRoomCreator: !!existingPlayer.isRoomCreator,
    });
  }

  // Check seat capacity (max 7 players)
  if (room.players.size >= 7) {
    return res.status(400).json({ error: 'This castle room is already full (7 players seated).' });
  }

  const name = (req.body.name || '').trim();
  if (!name) {
    return res.status(400).json({ error: 'Please enter your display name.' });
  }

  // Ensure unique display name
  const existingNames = Array.from(room.players.values()).map(p => p.name.toLowerCase());
  if (existingNames.includes(name.toLowerCase())) {
    return res.status(400).json({ error: `A player named '${name}' is already seated in this room.` });
  }

  const newToken = generateId('token_');
  const newPlayerId = generateId('p_');
  const seatNumber = room.players.size + 1;

  const newPlayer: Player = {
    id: newPlayerId,
    name,
    isRoomCreator: false,
    seatNumber,
    connected: true,
    score: 0,
  };

  room.players.set(newToken, newPlayer);
  room.state.seatingOrder.push(newPlayerId);
  broadcastState(room);

  res.json({
    roomCode: code,
    playerToken: newToken,
    playerId: newPlayerId,
    name,
    seatNumber,
    isRoomCreator: false,
  });
});

// Seed Demo Castle (Instant 7-player fully functioning game)
app.post('/api/rooms/demo-setup', (req, res) => {
  const code = 'DEMO7';
  const creatorToken = 'demo_token_libby';
  const room = {
    code,
    creatorToken,
    players: new Map<string, Player>(),
    state: createInitialState(code, true),
    sseClients: new Map(),
  };

  const demoGuestList = [
    { name: 'Libby', isCreator: true, token: 'demo_token_libby' },
    { name: 'Arthur', isCreator: false, token: 'demo_token_arthur' },
    { name: 'Beatrice', isCreator: false, token: 'demo_token_beatrice' },
    { name: 'Callum', isCreator: false, token: 'demo_token_callum' },
    { name: 'Daphne', isCreator: false, token: 'demo_token_daphne' },
    { name: 'Edgar', isCreator: false, token: 'demo_token_edgar' },
    { name: 'Fiona', isCreator: false, token: 'demo_token_fiona' },
  ];

  demoGuestList.forEach((guest, idx) => {
    const id = `p_${guest.name.toLowerCase()}`;
    room.players.set(guest.token, {
      id,
      name: guest.name,
      isRoomCreator: guest.isCreator,
      seatNumber: idx + 1,
      connected: true,
      score: 0,
    });
    room.state.seatingOrder.push(id);
  });

  rooms.set(code, room);
  startRoomTicker(room);

  res.json({
    roomCode: code,
    playerToken: creatorToken,
    playerId: 'p_libby',
    message: 'Demo Castle created with 7 seated players.',
  });
});

// SSE connection
app.get('/api/rooms/:code/events', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).send('Room not found');
  }

  const playerToken = (req.query.playerToken as string) || '';
  const isHost = req.query.isHost === 'true';
  const clientId = generateId('client_');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  room.sseClients.set(clientId, { res, playerToken, isHost });

  // Initial event
  const initial = sanitizeState(room, playerToken, isHost);
  res.write(`data: ${JSON.stringify(initial)}\n\n`);

  req.on('close', () => {
    room.sseClients.delete(clientId);
  });
});

// Get current state snapshot
app.get('/api/rooms/:code/state', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const playerToken = (req.query.playerToken as string) || '';
  const isHost = req.query.isHost === 'true';
  res.json(sanitizeState(room, playerToken, isHost));
});

// Perform game action
app.post('/api/rooms/:code/action', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const { action, payload, playerToken } = req.body;
  const player = playerToken ? room.players.get(playerToken) : undefined;
  const s = room.state;

  switch (action) {
    // Organiser / host controls
    case 'UPDATE_SEATING_ORDER': {
      if (payload?.seatingOrder && Array.isArray(payload.seatingOrder)) {
        s.seatingOrder = payload.seatingOrder;
        // Update player seatNumbers accordingly
        s.seatingOrder.forEach((pId, idx) => {
          const found = Array.from(room.players.values()).find(p => p.id === pId);
          if (found) found.seatNumber = idx + 1;
        });
      }
      break;
    }

    case 'START_GAME': {
      s.phase = 'INTRO';
      s.phaseTimeRemaining = 600; // 10 mins Introduction
      s.latestDialogue = HOST_SCRIPTS[s.currentRound].intro;
      break;
    }

    case 'ADVANCE_TO_ROLE_BRIEFING': {
      assignSecretRoles(room);
      s.phase = 'ROLE_BRIEFING';
      s.phaseTimeRemaining = 60; // 1 min private roles & briefing
      s.latestDialogue = HOST_SCRIPTS[s.currentRound].roleBriefing;
      break;
    }

    case 'ADVANCE_TO_MISSION': {
      s.phase = 'MISSION';
      s.phaseTimeRemaining = 420; // 7 mins mission instructions & play
      s.latestDialogue = HOST_SCRIPTS[s.currentRound].missionStart;
      break;
    }

    case 'ADVANCE_TO_ROUND_TABLE': {
      s.phase = 'ROUND_TABLE';
      s.phaseTimeRemaining = 300; // 5 mins discussion
      s.latestDialogue = HOST_SCRIPTS[s.currentRound].roundTable;
      break;
    }

    case 'ADVANCE_TO_VOTING': {
      s.phase = 'VOTING';
      s.phaseTimeRemaining = 240; // 4 mins voting, phone reveals, scoring
      s.latestDialogue = HOST_SCRIPTS[s.currentRound].votingOpen;

      // Reset lock states
      room.players.forEach(p => {
        p.hasLockedVote = false;
        p.hasRevealedSlate = false;
        p.votedForPlayerId = undefined;
        p.votedForPlayerName = undefined;
      });
      break;
    }

    // Player action: Lock in vote
    case 'LOCK_VOTE': {
      if (!player) return res.status(401).json({ error: 'Unknown player token' });
      const targetId = payload?.targetPlayerId;
      if (!targetId || targetId === player.id) {
        return res.status(400).json({ error: 'Cannot vote for yourself or invalid target.' });
      }
      const target = Array.from(room.players.values()).find(p => p.id === targetId);
      if (!target) return res.status(400).json({ error: 'Target player not found.' });

      player.votedForPlayerId = target.id;
      player.votedForPlayerName = target.name;
      player.hasLockedVote = true;

      // Check if all players have locked votes
      const allLocked = Array.from(room.players.values()).every(p => p.hasLockedVote);
      if (allLocked) {
        s.phase = s.isTieRevote ? 'TIE_REVEALS' : 'VOTE_REVEALS';
        s.currentRevealIndex = 0;
        s.latestDialogue = HOST_SCRIPTS[s.currentRound].allVotesLocked;
      }
      break;
    }

    // Phone slate reveals
    case 'FINISH_PHONE_SLATE': {
      const activePlayerId = s.seatingOrder[s.currentRevealIndex];
      const revealingPlayer = Array.from(room.players.values()).find(p => p.id === activePlayerId);
      if (revealingPlayer) {
        revealingPlayer.hasRevealedSlate = true;
        s.latestDialogue = HOST_SCRIPTS[s.currentRound].voteConfirmedSlate(
          revealingPlayer.name,
          revealingPlayer.votedForPlayerName || 'Unknown'
        );
      }

      s.currentRevealIndex += 1;

      // If all 7 players finished revealing
      if (s.currentRevealIndex >= s.seatingOrder.length) {
        // Tally votes
        const tallies: Record<string, number> = {};
        room.players.forEach(p => {
          if (p.votedForPlayerId) {
            tallies[p.votedForPlayerId] = (tallies[p.votedForPlayerId] || 0) + 1;
          }
        });

        // Find max votes
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

        // Check for tie
        if (candidatesWithMax.length > 1) {
          if (!s.isTieRevote) {
            // First tie: trigger Tie Defence & Revote
            s.isTieRevote = true;
            s.tieCandidateIds = candidatesWithMax;
            s.phase = 'TIE_DEFENCE';
            s.phaseTimeRemaining = 60; // 60s defence
            const candNames = candidatesWithMax.map(
              cId => Array.from(room.players.values()).find(p => p.id === cId)?.name || 'Unknown'
            );
            s.latestDialogue = HOST_SCRIPTS[s.currentRound].tieOccurred(candNames);
          } else {
            // Double tie: No banishment! Traitor survives!
            s.phase = 'BANISHMENT_OUTCOME';
            s.latestDialogue = HOST_SCRIPTS[s.currentRound].tieBanishmentFailed;
            recordRoundOutcome(room, null, false);
          }
        } else if (candidatesWithMax.length === 1) {
          // Clear winner banished
          const banishedId = candidatesWithMax[0];
          const banishedPlayer = Array.from(room.players.values()).find(p => p.id === banishedId);
          const wasTraitor = banishedId === s.traitorId;
          s.phase = 'BANISHMENT_OUTCOME';
          s.latestDialogue = HOST_SCRIPTS[s.currentRound].banishment(banishedPlayer?.name || 'Someone', wasTraitor);
          recordRoundOutcome(room, banishedId, wasTraitor);
        }
      }
      break;
    }

    case 'START_TIE_REVOTE': {
      s.phase = 'TIE_VOTING';
      s.phaseTimeRemaining = 90;
      s.currentRevealIndex = 0;
      room.players.forEach(p => {
        p.hasLockedVote = false;
        p.hasRevealedSlate = false;
        p.votedForPlayerId = undefined;
        p.votedForPlayerName = undefined;
      });
      break;
    }

    case 'CONFIRM_ASSIGNMENT_RESULT': {
      const success = !!payload?.success;
      const traitor = Array.from(room.players.values()).find(p => p.id === s.traitorId);
      if (traitor && success) {
        traitor.score += 1; // +1 bonus point for completing secret assignment
      }
      const lastHistory = s.roundHistory[s.roundHistory.length - 1];
      if (lastHistory) {
        lastHistory.traitorAssignmentCompleted = success;
      }
      s.phase = 'ROUND_SUMMARY';
      break;
    }

    case 'ADVANCE_NEXT_ROUND': {
      if (s.currentRound < 6) {
        s.currentRound += 1;
        s.latestDialogue = HOST_SCRIPTS[s.currentRound].intro;
        s.phase = 'INTRO';
        s.phaseTimeRemaining = 60;
      } else {
        s.phase = 'FINAL_RESULTS';
        // Compute grand winner
        const sorted = Array.from(room.players.values()).sort((a, b) => b.score - a.score);
        s.latestDialogue = HOST_SCRIPTS[6].finalResults(sorted[0]?.name || 'Libby');
        s.phaseTimeRemaining = 480; // 8 mins finale
      }
      break;
    }

    // Timer adjustments
    case 'TIMER_PLAY_PAUSE': {
      s.isTimerPaused = !s.isTimerPaused;
      break;
    }
    case 'TIMER_ADJUST': {
      const delta = parseInt(payload?.seconds || '0', 10);
      s.phaseTimeRemaining = Math.max(0, s.phaseTimeRemaining + delta);
      break;
    }

    // Mission 1: The Castle Heist actions
    case 'UPDATE_CASTLE_HEIST': {
      if (s.castleHeistState && payload) {
        s.castleHeistState = { ...s.castleHeistState, ...payload };
      }
      break;
    }

    // Mission 2: The Birthday Majority actions
    case 'UPDATE_BIRTHDAY_MAJORITY': {
      if (s.birthdayMajorityState && payload) {
        s.birthdayMajorityState = { ...s.birthdayMajorityState, ...payload };
      }
      break;
    }
    case 'SUBMIT_MAJORITY_INITIAL_ANSWER': {
      if (!s.birthdayMajorityState || !player) break;
      const { questionId, chosenName } = payload;
      if (!s.birthdayMajorityState.initialAnswers[player.id]) {
        s.birthdayMajorityState.initialAnswers[player.id] = {};
      }
      s.birthdayMajorityState.initialAnswers[player.id][questionId] = chosenName;
      break;
    }
    case 'SUBMIT_MAJORITY_PREDICTION': {
      if (!s.birthdayMajorityState || !player) break;
      const { questionId, predictedName } = payload;
      if (!s.birthdayMajorityState.predictions[questionId]) {
        s.birthdayMajorityState.predictions[questionId] = {};
      }
      s.birthdayMajorityState.predictions[questionId][player.id] = predictedName;
      break;
    }

    // Mission 3: The Forgery Gallery actions
    case 'UPDATE_FORGERY_GALLERY': {
      if (s.forgeryGalleryState && payload) {
        s.forgeryGalleryState = { ...s.forgeryGalleryState, ...payload };
      }
      break;
    }

    // Mission 4: The Body Disposal Committee actions
    case 'UPDATE_BODY_DISPOSAL': {
      if (s.bodyDisposalState && payload) {
        s.bodyDisposalState = { ...s.bodyDisposalState, ...payload };
      }
      break;
    }

    // Mission 5: The Counterfeit Expert actions
    case 'UPDATE_COUNTERFEIT_EXPERT': {
      if (s.counterfeitExpertState && payload) {
        s.counterfeitExpertState = { ...s.counterfeitExpertState, ...payload };
      }
      break;
    }

    // Mission 6: The Getaway Auction actions
    case 'UPDATE_GETAWAY_AUCTION': {
      if (s.getawayAuctionState && payload) {
        s.getawayAuctionState = { ...s.getawayAuctionState, ...payload };
      }
      break;
    }
    case 'SUBMIT_AUCTION_BID': {
      if (!s.getawayAuctionState || !player) break;
      const { lotNumber, bid } = payload;
      if (!s.getawayAuctionState.bids[lotNumber]) {
        s.getawayAuctionState.bids[lotNumber] = {};
      }
      s.getawayAuctionState.bids[lotNumber][player.id] = bid;
      break;
    }
    case 'RESOLVE_AUCTION_LOT': {
      if (!s.getawayAuctionState) break;
      const { lotNumber, winnerId, winningBid } = payload;
      const winner = Array.from(room.players.values()).find(p => p.id === winnerId);
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
      break;
    }

    // Demo helper: Auto-vote for simulated players to make testing instant!
    case 'DEMO_SIMULATE_VOTES': {
      if (s.isDemoRoom) {
        const pList = Array.from(room.players.values());
        pList.forEach(p => {
          if (!p.hasLockedVote) {
            // Pick random target other than self
            const targets = pList.filter(t => t.id !== p.id);
            const target = targets[Math.floor(Math.random() * targets.length)];
            p.votedForPlayerId = target.id;
            p.votedForPlayerName = target.name;
            p.hasLockedVote = true;
          }
        });
        const allLocked = pList.every(p => p.hasLockedVote);
        if (allLocked) {
          s.phase = s.isTieRevote ? 'TIE_REVEALS' : 'VOTE_REVEALS';
          s.currentRevealIndex = 0;
          s.latestDialogue = HOST_SCRIPTS[s.currentRound].allVotesLocked;
        }
      }
      break;
    }
  }

  broadcastState(room);
  res.json({ success: true, phase: s.phase });
});

function recordRoundOutcome(room: InternalRoom, banishedId: string | null, wasTraitor: boolean) {
  const s = room.state;
  const traitor = Array.from(room.players.values()).find(p => p.id === s.traitorId);
  const banished = banishedId ? Array.from(room.players.values()).find(p => p.id === banishedId) : null;
  const roundScores: Record<string, number> = {};
  const scoreBreakdown: Record<string, { missionPoints: number; mainObjectivePoints: number; bonusPoints: number; totalRoundPoints: number }> = {};
  const firstBallotVotes: Record<string, string> = {};

  // Compute 0-6 score breakdown per player
  room.players.forEach(p => {
    if (p.votedForPlayerId) {
      firstBallotVotes[p.id] = p.votedForPlayerId;
    }

    // 1. Mission Points (0 to 3)
    let missionPoints = 0;
    if (s.currentRound === 1 && s.castleHeistState) {
      const q = s.castleHeistState.qualifyingPlayers;
      missionPoints = [1, 2, 3].filter(st => q[st]?.includes(p.id)).length;
    } else if (s.currentRound === 2 && s.birthdayMajorityState) {
      missionPoints = Math.min(3, s.birthdayMajorityState.playerCorrectCount?.[p.id] || 0);
    } else if (s.currentRound === 3 && s.forgeryGalleryState) {
      const ms = s.forgeryGalleryState.qualifiedMilestones?.[p.id];
      missionPoints = (ms?.person ? 1 : 0) + (ms?.setting ? 1 : 0) + (ms?.threeObjects ? 1 : 0);
    } else if (s.currentRound === 4 && s.bodyDisposalState) {
      const ms = s.bodyDisposalState.milestones;
      missionPoints = (ms?.fiveObjectsChosen ? 1 : 0) + (ms?.allFiveInStory ? 1 : 0) + (ms?.presentationUnderOneMinute ? 1 : 0);
    } else if (s.currentRound === 5 && s.counterfeitExpertState) {
      const ms = s.counterfeitExpertState.playerMilestones?.[p.id];
      missionPoints = (ms?.under30Seconds ? 1 : 0) + (ms?.word1Used ? 1 : 0) + (ms?.word2Used ? 1 : 0);
    } else if (s.currentRound === 6 && s.getawayAuctionState) {
      const esc = s.getawayAuctionState.playerEscapePoints?.[p.id] || 0;
      missionPoints = Math.min(3, Math.max(1, Math.floor(esc / 2)));
    }
    missionPoints = Math.min(3, Math.max(0, missionPoints));

    // 2. Main Objective Points (0 or 2)
    let mainObjectivePoints = 0;
    if (p.role === 'FAITHFUL') {
      if (p.votedForPlayerId === s.traitorId) {
        mainObjectivePoints = 2; // +2 for voting for the Traitor on first ballot
      }
    } else if (p.role === 'TRAITOR') {
      if (banishedId !== s.traitorId) {
        mainObjectivePoints = 2; // +2 for surviving banishment (or tied revote)
      }
    }

    // 3. Bonus Points (0 or 1, added post-reveal verification)
    const bonusPoints = 0;
    const totalRoundPoints = missionPoints + mainObjectivePoints + bonusPoints;

    p.score += totalRoundPoints;
    roundScores[p.id] = totalRoundPoints;
    scoreBreakdown[p.id] = {
      missionPoints,
      mainObjectivePoints,
      bonusPoints,
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
    traitorAssignmentCompleted: false, // confirmed in assignment verification
    firstBallotVotes,
    scoreBreakdown,
    roundScores,
  };

  s.roundHistory.push(history);
}

// Development vs Production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`🏰 Traitors Castle server running at http://0.0.0.0:${port}`);
  });
}

startServer();
