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
  // Finale phases:
  | 'FINALE_AUCTION_RECAP'
  | 'FINALE_DISCUSSION'
  | 'FINALE_VOTING'
  | 'FINALE_VOTE_REVEALS'
  | 'FINALE_TIE_DEFENCE'
  | 'FINALE_TIE_VOTING'
  | 'FINALE_TIE_REVEALS'
  | 'FINALE_ELIMINATION'
  | 'FINALE_END_OR_BANISH'
  | 'FINALE_FINAL_REVEAL'
  | 'FINAL_RESULTS';

export interface Player {
  id: string;
  name: string;
  isHostDevice?: boolean;
  isRoomCreator?: boolean;
  seatNumber: number; // 1 to 7
  connected: boolean;
  score: number; // Frozen during round, updated in ROUND_SUMMARY / FINAL_RESULTS
  lastRoundScore?: number;
  isEliminated?: boolean; // Set in finale when permanently eliminated
  survivedFinale?: boolean;
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
  isEliminated?: boolean;
  survivedFinale?: boolean;
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
  personalObjectivePoints: number; // 0 or 2 (Faithful: first ballot Traitor accuracy; Traitor: secret assignment)
  roundOutcomePoints: number; // 0 or 1 (Faithful: Traitor banished; Traitor: Traitor survived)
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
  exhibitAPlantedObjectName?: string;
  exhibitAWon?: boolean;
  notes?: string;
}

// ----------------------------------------------------------------------
// MISSION 1: EXHIBIT A STATE
// ----------------------------------------------------------------------
export interface ExhibitAObject {
  id: string; // e.g. "obj_p_libby"
  contributorId: string;
  contributorName: string;
  name: string; // ordinary household object name
  hasPresented: boolean;
}

export interface ExhibitAState {
  stage:
    | 'COLLECTION'
    | 'SECRET_BRIEFING'
    | 'PRESENTATIONS'
    | 'EVIDENCE_VOTING'
    | 'EVIDENCE_REVEAL'
    | 'COMPLETED';
  objects: ExhibitAObject[];
  isListLocked: boolean;
  plantedObjectId?: string; // Secret to Traitor
  plantedObjectName?: string; // Secret to Traitor
  acknowledgedPlayerIds: string[]; // Generic list of players who acknowledged secret briefing
  evidenceVotes: Record<string, string>; // voterPlayerId -> objectId
  isEvidenceVoteLocked: boolean;
  evidenceVoteRevealed: boolean;
  isEvidenceTieRevote: boolean;
  tiedObjectIds: string[];
  winningObjectId?: string; // Chosen Exhibit A
  winningObjectName?: string;
  winningObjectContributorName?: string;
}

// ----------------------------------------------------------------------
// MISSION 2: THE BIRTHDAY MAJORITY
// ----------------------------------------------------------------------
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
  playerCorrectCount: Record<string, number>;
  traitorTargetFaithfulId?: string;
  traitorTargetFaithfulName?: string;
  traitorAssignedQuestionId?: number;
  traitorAssignedIncorrectPrediction?: string;
  traitorAssignmentSuccess?: boolean;
}

// ----------------------------------------------------------------------
// MISSION 3: THE FORGERY GALLERY
// ----------------------------------------------------------------------
export interface ForgeryGalleryState {
  faithfulBrief: string;
  traitorBrief: string;
  qualifiedMilestones: Record<string, { person: boolean; setting: boolean; threeObjects: boolean }>;
  isDrawingLocked: boolean;
}

// ----------------------------------------------------------------------
// MISSION 4: THE BODY DISPOSAL COMMITTEE
// ----------------------------------------------------------------------
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

// ----------------------------------------------------------------------
// MISSION 5: THE COUNTERFEIT EXPERT
// ----------------------------------------------------------------------
export interface CounterfeitExpertState {
  invention: string;
  faithfulThreeWords: [string, string, string];
  traitorTwoWords: [string, string];
  missingThirdWord: string;
  speakingOrder: string[];
  playerMilestones: Record<string, { under30Seconds: boolean; word1Used: boolean; word2Used: boolean; word3Attempted: boolean }>;
  traitorGuessedWordSuccess?: boolean;
}

// ----------------------------------------------------------------------
// MISSION 6: THE GETAWAY AUCTION
// ----------------------------------------------------------------------
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

// ----------------------------------------------------------------------
// FINALE STATE (ROUND 6 POST-AUCTION)
// ----------------------------------------------------------------------
export interface FinaleState {
  stage:
    | 'AUCTION_RECAP'
    | 'DISCUSSION'
    | 'VOTING'
    | 'VOTE_REVEALS'
    | 'TIE_DEFENCE'
    | 'TIE_VOTING'
    | 'TIE_REVEALS'
    | 'ELIMINATION_OUTCOME'
    | 'END_OR_BANISH'
    | 'FINAL_REVEAL';
  cycleNumber: number;
  eliminationCount: number; // Count of mandatory eliminations (targets 3 to reach 4 survivors)
  eliminatedPlayerIds: string[]; // Permanently banished players (roles kept secret until final reveal!)
  currentEliminatedPlayerId?: string; // Player just banished in current cycle
  firstBanishmentVotes: Record<string, string>; // voterId -> targetId from first finale vote (for Faithful scoring)
  // End or Banish
  endOrBanishChoices: Record<string, 'END' | 'BANISH'>; // survivorId -> choice
  endOrBanishRevealed: boolean;
  // Step-by-step survivor reveal
  revealedSurvivorIds: string[];
  currentSurvivorRevealIndex: number;
  allSurvivorsRevealed: boolean;
  // Overall outcome
  overallWinnerId?: string;
  overallWinnerName?: string;
  isTraitorWinner?: boolean;
  jointWinnerNames?: string[];
  loserPlayerId?: string;
  loserPlayerName?: string;
  jointLoserNames?: string[];
  forfeitCompleted?: boolean;
}

// ----------------------------------------------------------------------
// SERVER STATE & CLIENT PERSPECTIVE STATE
// ----------------------------------------------------------------------
export interface GameState {
  roomCode: string;
  currentRound: number; // 1 to 6
  phase: GamePhase;
  phaseTimeRemaining: number;
  isTimerPaused: boolean;
  timerDeadline?: number;
  timerDurationSec?: number;
  timerPausedRemaining?: number;
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
  exhibitAState?: ExhibitAState;
  birthdayMajorityState?: BirthdayMajorityState;
  forgeryGalleryState?: ForgeryGalleryState;
  bodyDisposalState?: BodyDisposalState;
  counterfeitExpertState?: CounterfeitExpertState;
  getawayAuctionState?: GetawayAuctionState;
  finaleState?: FinaleState;
}

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
  isMyEliminated?: boolean;

  // Post-banishment / end of round revealed secrets:
  revealedTraitorId?: string;
  revealedTraitorName?: string;
  revealedTraitorObjective?: TraitorObjective;
  revealedPlantedObjectName?: string;
  traitorAssignmentSuccess?: boolean | null;
  banishedPlayerId?: string | null;
  banishedPlayerName?: string | null;
  wasTraitorCaught?: boolean;

  // Active Mission States (Sanitized per player token)
  exhibitAState?: ExhibitAState;
  birthdayMajorityState?: BirthdayMajorityState;
  forgeryGalleryState?: ForgeryGalleryState;
  bodyDisposalState?: BodyDisposalState;
  counterfeitExpertState?: CounterfeitExpertState;
  getawayAuctionState?: GetawayAuctionState;
  finaleState?: FinaleState;
}

export interface AudioEventMapping {
  eventId: string;
  name: string;
  audioUrl?: string;
  fileName?: string;
}
