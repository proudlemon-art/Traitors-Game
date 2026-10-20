export type Role = 'TRAITOR' | 'FAITHFUL';

export type GamePhase =
  | 'LOBBY'
  | 'INTRO'
  | 'ROLE_BRIEFING'
  | 'MISSION'
  | 'ROUND_TABLE'
  | 'VOTING'
  | 'VOTE_REVEALS'
  | 'TIE_DEFENCE'
  | 'TIE_VOTING'
  | 'TIE_REVEALS'
  | 'BANISHMENT_OUTCOME'
  | 'ASSIGNMENT_VERIFICATION'
  | 'ROUND_SUMMARY'
  | 'FINAL_RESULTS';

export interface Player {
  id: string;
  name: string;
  isHostDevice?: boolean;
  isRoomCreator?: boolean;
  seatNumber: number; // 1 to 7
  connected: boolean;
  score: number; // Frozen during round, updated in ROUND_SUMMARY
  lastRoundScore?: number;
  // Private fields only populated for player themselves or post-reveal:
  role?: Role;
  secretMission?: string;
  hasLockedVote?: boolean;
  hasRevealedSlate?: boolean;
  votedForPlayerId?: string;
  votedForPlayerName?: string;
}

export interface SanitizedPlayer {
  id: string;
  name: string;
  seatNumber: number;
  connected: boolean;
  score: number;
  lastRoundScore?: number;
  isRoomCreator: boolean;
  hasLockedVote: boolean;
  hasRevealedSlate: boolean;
  revealedVoteForId?: string;
  revealedVoteForName?: string;
  revealedRole?: Role;
}

export interface TraitorObjective {
  title: string;
  description: string;
  conversationalGoal: string;
  successCondition: string;
}

export interface PlayerScoreBreakdown {
  missionPoints: number; // 0 to 3
  mainObjectivePoints: number; // 0 or 2
  bonusPoints: number; // 0 or 1
  totalRoundPoints: number; // sum: 0 to 6
}

export interface RoundHistory {
  roundNumber: number;
  traitorId: string;
  traitorName: string;
  banishedPlayerId: string | null;
  banishedPlayerName: string | null;
  wasTraitorBanished: boolean;
  traitorAssignmentCompleted: boolean;
  firstBallotVotes: Record<string, string>; // voterId -> targetId
  scoreBreakdown: Record<string, PlayerScoreBreakdown>; // playerId -> breakdown
  roundScores: Record<string, number>; // playerId -> totalRoundPoints
  notes?: string;
}

// ----------------------------------------------------------------------
// SIX SPECIFIC MISSION STATES
// ----------------------------------------------------------------------

// MISSION 1: THE CASTLE HEIST
export interface CastleHeistState {
  currentStage: 1 | 2 | 3;
  confirmedHouseholdItems: string[];
  targetObjectForTraitor: string;
  qualifyingPlayers: Record<number, string[]>; // stage -> playerIds who presented qualifying object
  stageVotes: Record<number, Record<string, string>>; // stage -> (voterId -> targetId)
  stageFavorites: Record<number, { playerId: string; playerName: string }>;
}

// MISSION 2: THE BIRTHDAY MAJORITY
export interface BirthdayMajorityQuestion {
  id: number;
  prompt: string;
}

export interface BirthdayMajorityState {
  questions: BirthdayMajorityQuestion[];
  step: 'INITIAL_ANSWERS' | 'PREDICTION_REVEAL' | 'COMPLETED';
  activeQuestionIndex: number;
  initialAnswers: Record<string, Record<number, string>>; // playerId -> (questionId -> chosenName)
  allInitialAnswersLocked: boolean;
  predictions: Record<number, Record<string, string>>; // questionId -> (playerId -> predictedName)
  questionResults?: Record<number, { topNames: string[]; votesCount: Record<string, number> }>;
  playerCorrectCount: Record<string, number>; // playerId -> count of correct predictions
  traitorTargetFaithfulId?: string;
  traitorTargetFaithfulName?: string;
  traitorAssignedQuestionId?: number;
  traitorAssignedIncorrectPrediction?: string;
  traitorAssignmentSuccess?: boolean;
}

// MISSION 3: THE FORGERY GALLERY
export interface ForgeryGalleryState {
  faithfulBrief: string;
  traitorBrief: string;
  qualifiedMilestones: Record<string, { person: boolean; setting: boolean; threeObjects: boolean }>;
  isDrawingLocked: boolean;
}

// MISSION 4: THE BODY DISPOSAL COMMITTEE
export interface BodyDisposalState {
  scenario: string;
  confirmedHouseholdItems: string[];
  traitorAssignedObject: string;
  chosenFiveObjects: string[];
  milestones: {
    fiveObjectsChosen: boolean;
    allFiveInStory: boolean;
    presentationUnderOneMinute: boolean;
  };
  traitorObjectFetchedByOther?: boolean;
}

// MISSION 5: THE COUNTERFEIT EXPERT
export interface CounterfeitExpertState {
  invention: string;
  faithfulThreeWords: [string, string, string];
  traitorTwoWords: [string, string];
  missingThirdWord: string;
  speakingOrder: string[];
  playerMilestones: Record<string, { under30Seconds: boolean; word1Used: boolean; word2Used: boolean; word3Attempted: boolean }>;
  traitorGuessedWordSuccess?: boolean;
}

// MISSION 6: THE GETAWAY AUCTION
export interface AuctionLot {
  lotNumber: number;
  title: string;
  description: string;
  escapePoints: number;
}

export interface GetawayAuctionState {
  currentLotIndex: number; // 0 to 5
  lots: AuctionLot[];
  playerCoins: Record<string, number>; // playerId -> coins (12 start)
  playerEscapePoints: Record<string, number>; // playerId -> escape points
  purchasedLots: Record<string, number[]>; // playerId -> lotNumbers
  bids: Record<number, Record<string, number>>; // lotNumber -> (playerId -> bid)
  activeLotBidsLocked: boolean;
  tieRebidActive: boolean;
  tieCandidateIds: string[];
  tieRebids: Record<string, number>;
  traitorTargetFaithfulId?: string;
  traitorTargetFaithfulName?: string;
  traitorAssignmentSuccess?: boolean;
  lotWinners: Record<number, { winnerId: string; winnerName: string; winningBid: number } | null>;
}

export interface GameState {
  roomCode: string;
  currentRound: number; // 1 to 6
  phase: GamePhase;
  phaseTimeRemaining: number;
  isTimerPaused: boolean;
  timerDeadline?: number; // timestamp in ms when phase expires
  timerDurationSec?: number; // initial duration in seconds
  timerPausedRemaining?: number; // remaining seconds when paused
  seatingOrder: string[]; // playerIds 1..7
  currentRevealIndex: number;
  tieCandidateIds: string[];
  tieRevealIndex: number;
  isTieRevote: boolean;
  traitorId: string | null;
  traitorName: string | null;
  traitorObjective: TraitorObjective | null;
  roundHistory: RoundHistory[];
  latestDialogue: string;
  isDemoRoom?: boolean;
  totalGoldPot?: number;
  roundGold?: number;

  // Active round mission states
  castleHeistState?: CastleHeistState;
  birthdayMajorityState?: BirthdayMajorityState;
  forgeryGalleryState?: ForgeryGalleryState;
  bodyDisposalState?: BodyDisposalState;
  counterfeitExpertState?: CounterfeitExpertState;
  getawayAuctionState?: GetawayAuctionState;
}

// Client perspective state sent by backend:
export interface ClientGameState {
  roomCode: string;
  currentRound: number;
  phase: GamePhase;
  phaseTimeRemaining: number;
  isTimerPaused: boolean;
  timerDeadline?: number;
  timerDurationSec?: number;
  timerPausedRemaining?: number;
  seatingOrder: string[];
  currentRevealIndex: number;
  tieCandidateIds: string[];
  tieRevealIndex: number;
  isTieRevote: boolean;
  players: SanitizedPlayer[];
  roundHistory: RoundHistory[];
  latestDialogue: string;
  isDemoRoom?: boolean;
  totalGoldPot?: number;
  roundGold?: number;

  // Player-specific private fields:
  myPlayerId?: string;
  myRole?: Role;
  mySecretBriefing?: string;
  mySecretMission?: string;
  myVotedForId?: string;
  myHasLockedVote?: boolean;
  myHasRevealedSlate?: boolean;
  isMyTurnToReveal?: boolean;

  // Post-banishment / end of round revealed secrets:
  revealedTraitorId?: string;
  revealedTraitorName?: string;
  revealedTraitorObjective?: TraitorObjective;
  traitorAssignmentSuccess?: boolean | null;
  banishedPlayerId?: string | null;
  banishedPlayerName?: string | null;
  wasTraitorCaught?: boolean;

  // Active Mission States (Sanitized per player token)
  castleHeistState?: CastleHeistState;
  birthdayMajorityState?: BirthdayMajorityState;
  forgeryGalleryState?: ForgeryGalleryState;
  bodyDisposalState?: BodyDisposalState;
  counterfeitExpertState?: CounterfeitExpertState;
  getawayAuctionState?: GetawayAuctionState;
}

export interface AudioEventMapping {
  eventId: string;
  name: string;
  audioUrl?: string;
  fileName?: string;
}
