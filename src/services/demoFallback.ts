import { ClientGameState, SanitizedPlayer, ExhibitAObject } from '../types/game';
import { HOST_SCRIPTS } from '../data/dialogue';

export const DEMO_GUESTS: Array<{
  id: string;
  name: string;
  token: string;
  seat: number;
  object: string;
}> = [
  { id: 'p_libby', name: 'Libby', token: 'demo_token_libby', seat: 1, object: 'Antique Pocket Watch' },
  { id: 'p_arthur', name: 'Arthur', token: 'demo_token_arthur', seat: 2, object: 'Black Leather Glove' },
  { id: 'p_beatrice', name: 'Beatrice', token: 'demo_token_beatrice', seat: 3, object: 'Crimson Handkerchief' },
  { id: 'p_callum', name: 'Callum', token: 'demo_token_callum', seat: 4, object: 'Ornate Brass Key' },
  { id: 'p_daphne', name: 'Daphne', token: 'demo_token_daphne', seat: 5, object: 'Poison Decanter Flask' },
  { id: 'p_edgar', name: 'Edgar', token: 'demo_token_edgar', seat: 6, object: 'Wax-Sealed Letter' },
  { id: 'p_fiona', name: 'Fiona', token: 'demo_token_fiona', seat: 7, object: 'Engraved Silver Spoon' },
];

export function createFallbackDemoClientState(
  playerToken: string = 'demo_token_libby',
  isHost: boolean = true
): ClientGameState {
  const sanitizedPlayers: SanitizedPlayer[] = DEMO_GUESTS.map(g => ({
    id: g.id,
    name: g.name,
    seatNumber: g.seat,
    connected: true,
    score: 0,
    isRoomCreator: g.id === 'p_libby',
    hasLockedVote: false,
    hasRevealedSlate: false,
    isEliminated: false,
  }));

  const objects: ExhibitAObject[] = DEMO_GUESTS.map(g => ({
    id: `obj_${g.id}`,
    contributorId: g.id,
    contributorName: g.name,
    name: g.object,
    hasPresented: true,
  }));

  const activeGuest = DEMO_GUESTS.find(g => g.token === playerToken) || DEMO_GUESTS[0];
  const isTraitor = activeGuest.id === 'p_arthur'; // Arthur is pre-assigned traitor in demo

  return {
    roomCode: 'DEMO7',
    currentRound: 1,
    phase: 'LOBBY',
    phaseTimeRemaining: 480,
    timerDurationSec: 480,
    timerDeadline: Date.now() + 480 * 1000,
    isTimerPaused: false,
    seatingOrder: DEMO_GUESTS.map(g => g.id),
    currentRevealIndex: 0,
    tieCandidateIds: [],
    tieRevealIndex: 0,
    isTieRevote: false,
    players: sanitizedPlayers,
    roundHistory: [],
    latestDialogue: HOST_SCRIPTS[1]?.intro || 'Welcome to Jasmine’s Castle.',
    isDemoRoom: true,
    totalGoldPot: 0,
    roundGold: 0,
    traitorId: isHost ? 'p_arthur' : null,
    traitorName: isHost ? 'Arthur' : null,

    // Active player view context
    myPlayerId: isHost ? undefined : activeGuest.id,
    myRole: isHost ? undefined : isTraitor ? 'TRAITOR' : 'FAITHFUL',
    mySecretBriefing: isHost
      ? undefined
      : isTraitor
      ? 'You are the TRAITOR for Round 1. Your mission: Plant the Crimson Handkerchief as Exhibit A without getting banished.'
      : 'You are FAITHFUL. Spot the Traitor, defend your innocent objects, and survive the vote.',
    mySecretMission: isHost
      ? undefined
      : isTraitor
      ? 'Guide the Faithful to select the Crimson Handkerchief during the Exhibit A vote.'
      : undefined,
    myHasLockedVote: false,
    myHasRevealedSlate: false,
    isMyTurnToReveal: false,
    isMyEliminated: false,

    exhibitAState: {
      stage: 'COLLECTION',
      objects,
      isListLocked: true,
      acknowledgedPlayerIds: DEMO_GUESTS.map(g => g.id),
      evidenceVotes: {},
      isEvidenceVoteLocked: false,
      evidenceVoteRevealed: false,
      isEvidenceTieRevote: false,
      tiedObjectIds: [],
      plantedObjectId: isHost || isTraitor ? 'obj_p_beatrice' : undefined,
      plantedObjectName: isHost || isTraitor ? 'Crimson Handkerchief' : undefined,
    },
  };
}
