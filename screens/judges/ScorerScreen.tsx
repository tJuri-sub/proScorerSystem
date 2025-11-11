import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import { FIREBASE_AUTH, FIREBASE_DB } from "../../firebaseconfig";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  query,
  where,
  onSnapshot,
  getDoc,
  orderBy,
  updateDoc,
} from "firebase/firestore";
import { useFonts, Inter_400Regular } from "@expo-google-fonts/inter";
import styles from "../../components/styles/judgeStyles/ScorerStyling";
import robostyles from "../../components/styles/judgeStyles/RobosportsStyling";
import { Feather } from "@expo/vector-icons";
import DropDownPicker from "react-native-dropdown-picker";
import RoboSportsMatchScorer from "../../components/component/judgeDrawer/robosports/RoboSportsScorer";
// Add these imports
import {
  Tournament,
  TournamentBracket,
} from "../../components/component/judgeDrawer/robosports/TournamentTypes";
import { TournamentManager } from "../../components/component/judgeDrawer/robosports/TournamentManager";
import TournamentSetup from "../../components/component/judgeDrawer/robosports/TournamentSetup";

interface GameData {
  id: string;
  gameNumber: number;
  eventId: string;
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  status: "created" | "in-progress" | "finished";
  currentMatch: number;
  matchResults: any[];
  gameWinner: string | null;
  team1Points: number;
  team2Points: number;
  createdAt: string;
  completedAt?: string;
  tournamentId?: string;
  bracketId?: string;
  currentMatchState?: {
    team1Balls: { orange: number; purple: number };
    team2Balls: { orange: number; purple: number };
  };
}

export default function ScorerScreen({ navigation }: any) {
  let [fontsLoaded] = useFonts({
    Inter_400Regular,
  });

  const user = FIREBASE_AUTH.currentUser;
  const [judgeCategory, setJudgeCategory] = useState<string | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Event states
  const [assignedEvents, setAssignedEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Status filtering (for RoboMission and Future Engineers)
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // Modal state
  const [scoreModalVisible, setScoreModalVisible] = useState(false);
  const [scoringTeam, setScoringTeam] = useState<any>(null);
  const [scoringStep, setScoringStep] = useState<1 | 2 | 3>(1);
  const [inputScore, setInputScore] = useState("");
  const [inputMinute, setInputMinute] = useState("");
  const [inputSecond, setInputSecond] = useState("");
  const [inputMs, setInputMs] = useState("");
  const [search, setSearch] = useState("");

  // Error states for Future Innovators
  const [projectError, setProjectError] = useState(false);
  const [roboticError, setRoboticError] = useState(false);
  const [presentationError, setPresentationError] = useState(false);

  // Inline error message
  const [submitError, setSubmitError] = useState("");

  // Robomission states
  const [selectedDay, setSelectedDay] = useState<1 | 2>(1);

  // RoboSports states
  const [games, setGames] = useState<GameData[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTeam1, setSelectedTeam1] = useState<string>("");
  const [selectedTeam2, setSelectedTeam2] = useState<string>("");
  const [team1DropdownOpen, setTeam1DropdownOpen] = useState(false);
  const [team2DropdownOpen, setTeam2DropdownOpen] = useState(false);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [activeGame, setActiveGame] = useState<GameData | null>(null);
  const [showScorerModal, setScorerModal] = useState(false);

  // Robosports Tournament states
  const [tournamentMode, setTournamentMode] = useState<
    "regular" | "tournament"
  >("regular");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] =
    useState<Tournament | null>(null);
  const [showTournamentSetup, setShowTournamentSetup] = useState(false);

  // Future Engineers states
  const [feRoundType, setFeRoundType] = useState<"open" | "obstacle">("open");
  const [inputDocScore, setInputDocScore] = useState("");
  const [fePill, setFePill] = useState<"open" | "obstacle">("open");

  function parseTimeStringToMs(timeStr: string) {
    if (!timeStr) return Infinity;
    const [mm, rest] = timeStr.split(":");
    const [ss, ms] = rest.split(".");
    return (
      (Number(mm) || 0) * 60000 +
      (Number(ss) || 0) * 1000 +
      (Number(ms) || 0) * 10
    );
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.openDrawer()}
          style={{ marginLeft: 15 }}
        >
          <Feather name="menu" size={24} color="black" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Fetch judge's assigned category and events
  useEffect(() => {
    const fetchJudgeData = async () => {
      const user = FIREBASE_AUTH.currentUser;
      if (user) {
        try {
          // Get judge info
          const userDoc = await getDoc(
            doc(FIREBASE_DB, "judge-users", user.uid)
          );
          if (userDoc.exists()) {
            const data = userDoc.data();
            const category = data.category || null;
            setJudgeCategory(category);

            // Fetch events where this judge is assigned to this category
            const eventsRef = collection(FIREBASE_DB, "events");
            const eventsSnapshot = await getDocs(eventsRef);

            const judgeEvents: any[] = [];
            eventsSnapshot.forEach((eventDoc) => {
              const eventData = eventDoc.data();
              const categoryData = eventData.categoryData;

              // Check if judge is assigned to this event's category
              if (
                categoryData &&
                categoryData[category] &&
                categoryData[category].judges
              ) {
                const assignedJudges = categoryData[category].judges || [];
                if (assignedJudges.includes(user.uid)) {
                  judgeEvents.push({
                    id: eventDoc.id,
                    title: eventData.title || "Untitled Event",
                    date: eventData.date || "",
                    ...eventData,
                  });
                }
              }
            });

            // Sort by date (newest first)
            judgeEvents.sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            setAssignedEvents(judgeEvents);

            // Auto-select first event if available
            if (judgeEvents.length > 0) {
              setSelectedEvent(judgeEvents[0].id);
            }
          }
        } catch (err) {
          console.log("Error fetching judge data:", err);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchJudgeData();
  }, [user]);

  // Load RoboSports games when category is robosports
  useEffect(() => {
    if (judgeCategory !== "robosports" || !selectedEvent) return;

    const gamesRef = collection(
      FIREBASE_DB,
      "events",
      selectedEvent,
      "robosports-games"
    );
    const gamesQuery = query(gamesRef, orderBy("gameNumber", "asc"));

    const unsubscribe = onSnapshot(gamesQuery, (snapshot) => {
      const loadedGames: GameData[] = [];
      snapshot.forEach((doc) => {
        loadedGames.push({ id: doc.id, ...doc.data() } as GameData);
      });
      setGames(loadedGames);
    });

    return () => unsubscribe();
  }, [judgeCategory, selectedEvent]);

  // Fetch teams and scores for selected event
  useEffect(() => {
    let unsubscribeTeams: (() => void) | undefined;
    let unsubscribeScores: (() => void) | undefined;

    const fetchTeamsAndScores = async () => {
      if (!judgeCategory || !selectedEvent) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Get event document
        const eventDoc = await getDoc(
          doc(FIREBASE_DB, "events", selectedEvent)
        );
        if (!eventDoc.exists()) {
          setTeams([]);
          setLoading(false);
          return;
        }
        const eventData = eventDoc.data();
        const categoryTeams =
          eventData?.categoryData?.[judgeCategory]?.teams || [];

        // Fetch team data from categories/{category}/teams
        const teamDocs = await Promise.all(
          categoryTeams.map(async (teamId: string) => {
            const teamDoc = await getDoc(
              doc(FIREBASE_DB, "categories", judgeCategory, "teams", teamId)
            );
            return teamDoc.exists()
              ? { id: teamDoc.id, ...teamDoc.data() }
              : null;
          })
        );
        const teamList = teamDocs.filter(Boolean);

        // Fetch scores for this event and category
        const scoresRef = collection(
          FIREBASE_DB,
          "events",
          selectedEvent,
          "scores"
        );
        const scoresSnap = await getDocs(scoresRef);
        const scoresMap: Record<string, any> = {};
        scoresSnap.forEach((doc) => {
          const score = doc.data();
          scoresMap[score.teamId] = score;
        });

        // Merge scores into teams
        const mergedTeams = teamList.map((team) => ({
          ...team,
          ...scoresMap[team.id],
        }));

        setTeams(mergedTeams);
        setLoading(false);
      } catch (err) {
        console.log("Error fetching teams or scores:", err);
        setLoading(false);
      }
    };

    fetchTeamsAndScores();

    return () => {
      if (unsubscribeTeams) unsubscribeTeams();
      if (unsubscribeScores) unsubscribeScores();
    };
  }, [judgeCategory, selectedEvent]);

  // RoboSports functions
  const getNextGameNumber = () => {
    if (games.length === 0) return 1;
    return Math.max(...games.map((g) => g.gameNumber)) + 1;
  };

  const createNewGame = async () => {
    if (!selectedTeam1 || !selectedTeam2) {
      Alert.alert("Error", "Please select both teams");
      return;
    }

    if (selectedTeam1 === selectedTeam2) {
      Alert.alert("Error", "Please select different teams");
      return;
    }

    // Check if these teams already have an ongoing game
    const existingGame = games.find(
      (g) =>
        g.status !== "finished" &&
        ((g.team1Id === selectedTeam1 && g.team2Id === selectedTeam2) ||
          (g.team1Id === selectedTeam2 && g.team2Id === selectedTeam1))
    );

    if (existingGame) {
      Alert.alert("Error", "These teams already have an ongoing game");
      return;
    }

    setIsCreatingGame(true);

    try {
      const gameNumber = getNextGameNumber();
      const gameData: Omit<GameData, "id"> = {
        gameNumber,
        eventId: selectedEvent,
        team1Id: selectedTeam1,
        team2Id: selectedTeam2,
        team1Name: teams.find((t) => t.id === selectedTeam1)?.teamName || "",
        team2Name: teams.find((t) => t.id === selectedTeam2)?.teamName || "",
        status: "created",
        currentMatch: 1,
        matchResults: [],
        gameWinner: null,
        team1Points: 0,
        team2Points: 0,
        createdAt: new Date().toISOString(),
        currentMatchState: {
          team1Balls: { orange: 4, purple: 1 },
          team2Balls: { orange: 4, purple: 1 },
        },
      };

      const gameRef = doc(
        collection(FIREBASE_DB, "events", selectedEvent, "robosports-games")
      );
      await setDoc(gameRef, gameData);

      setSelectedTeam1("");
      setSelectedTeam2("");
      setShowCreateModal(false);
    } catch (error) {
      console.error("Error creating game:", error);
      Alert.alert("Error", "Failed to create game");
    } finally {
      setIsCreatingGame(false);
    }
  };

  const openGameScorer = (game: GameData) => {
    if (game.status === "finished") return;

    setActiveGame(game);
    setScorerModal(true);

    // Mark game as in-progress if it was just created
    if (game.status === "created") {
      const gameRef = doc(
        FIREBASE_DB,
        "events",
        selectedEvent,
        "robosports-games",
        game.id
      );
      updateDoc(gameRef, { status: "in-progress" });
    }
  };

  const updateRoboSportsStandings = async () => {
    if (!selectedEvent || judgeCategory !== "robosports") return;

    try {
      // Fetch all completed games
      const gamesRef = collection(
        FIREBASE_DB,
        "events",
        selectedEvent,
        "robosports-games"
      );
      const gamesSnapshot = await getDocs(gamesRef);

      // Calculate standings
      const standings: Record<string, any> = {};

      // Initialize all teams
      teams.forEach((team) => {
        standings[team.id] = {
          teamId: team.id,
          teamName: team.teamName,
          totalPoints: 0,
          violations: 0,
          opponentBallScore: 0,
          gamesPlayed: 0,
        };
      });

      // Process each game
      gamesSnapshot.forEach((doc) => {
        const game = doc.data();

        // Update team 1
        if (standings[game.team1Id]) {
          standings[game.team1Id].totalPoints += game.team1Points;
          standings[game.team1Id].gamesPlayed += 1;

          // Count violations for team 1
          const team1Violations = game.matchResults.filter(
            (match: any) => match.violation && match.winner !== game.team1Id
          ).length;
          standings[game.team1Id].violations += team1Violations;

          // Calculate opponent ball scores for tie-breaking
          game.matchResults.forEach((match: any) => {
            standings[game.team1Id].opponentBallScore += match.team2Score;
          });
        }

        // Update team 2
        if (standings[game.team2Id]) {
          standings[game.team2Id].totalPoints += game.team2Points;
          standings[game.team2Id].gamesPlayed += 1;

          // Count violations for team 2
          const team2Violations = game.matchResults.filter(
            (match: any) => match.violation && match.winner !== game.team2Id
          ).length;
          standings[game.team2Id].violations += team2Violations;

          // Calculate opponent ball scores for tie-breaking
          game.matchResults.forEach((match: any) => {
            standings[game.team2Id].opponentBallScore += match.team1Score;
          });
        }
      });

      // Update teams state with standings data
      setTeams((prevTeams) =>
        prevTeams.map((team) => ({
          ...team,
          ...standings[team.id],
        }))
      );
    } catch (error) {
      console.error("Error updating RoboSports standings:", error);
    }
  };

  //function to handle creating tournament games
  const createTournamentGame = async (bracket: TournamentBracket) => {
    if (!bracket.team1Id || !bracket.team2Id) return;

    try {
      const gameNumber = getNextGameNumber();
      const gameData: Omit<GameData, "id"> = {
        gameNumber,
        eventId: selectedEvent,
        team1Id: bracket.team1Id,
        team2Id: bracket.team2Id,
        team1Name: bracket.team1Name,
        team2Name: bracket.team2Name,
        status: "created",
        currentMatch: 1,
        matchResults: [],
        gameWinner: null,
        team1Points: 0,
        team2Points: 0,
        createdAt: new Date().toISOString(),
        tournamentId: bracket.tournamentId, // NEW: Link to tournament
        bracketId: bracket.id, // NEW: Link to bracket
        currentMatchState: {
          team1Balls: { orange: 4, purple: 1 },
          team2Balls: { orange: 4, purple: 1 },
        },
      };

      const gameRef = doc(
        collection(FIREBASE_DB, "events", selectedEvent, "robosports-games")
      );
      await setDoc(gameRef, gameData);

      // Update bracket status to in-progress
      const tournamentRef = doc(
        FIREBASE_DB,
        "events",
        selectedEvent,
        "tournaments",
        bracket.tournamentId
      );
      const tournamentDoc = await getDoc(tournamentRef);

      if (tournamentDoc.exists()) {
        const tournament = tournamentDoc.data() as Tournament;
        const updatedBrackets = tournament.brackets.map((b) =>
          b.id === bracket.id
            ? { ...b, status: "in-progress" as const, gameId: gameRef.id }
            : b
        );

        await updateDoc(tournamentRef, { brackets: updatedBrackets });
      }

      // Open the game scorer
      setActiveGame({ id: gameRef.id, ...gameData });
      setScorerModal(true);
    } catch (error) {
      console.error("Error creating tournament game:", error);
      Alert.alert("Error", "Failed to create tournament game");
    }
  };

  // Add this useEffect to load tournaments
  useEffect(() => {
    if (judgeCategory !== "robosports" || !selectedEvent) return;

    const tournamentsRef = collection(
      FIREBASE_DB,
      "events",
      selectedEvent,
      "tournaments"
    );
    const tournamentsQuery = query(
      tournamentsRef,
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(tournamentsQuery, (snapshot) => {
      const loadedTournaments: Tournament[] = [];
      snapshot.forEach((doc) => {
        loadedTournaments.push({ id: doc.id, ...doc.data() } as Tournament);
      });
      setTournaments(loadedTournaments);
    });

    return () => unsubscribe();
  }, [judgeCategory, selectedEvent]);

  // Call this function when teams or selectedEvent changes for robosports
  useEffect(() => {
    if (judgeCategory === "robosports" && selectedEvent) {
      updateRoboSportsStandings();
    }
  }, [selectedEvent, judgeCategory]);

  // Card status helpers
  const getCardStatus = (team: any) => {
    // RoboMission: two rounds
    if (
      judgeCategory === "robo-elem" ||
      judgeCategory === "robo-junior" ||
      judgeCategory === "robo-senior"
    ) {
      if (selectedDay === 1) {
        const hasR1 =
          team.day1Round1Score !== null && team.day1Round1Score !== undefined;
        const hasR2 =
          team.day1Round2Score !== null && team.day1Round2Score !== undefined;
        const hasR3 =
          team.day1Round3Score !== null && team.day1Round3Score !== undefined;
        if (!hasR1 && !hasR2 && !hasR3) return "no-score";
        if (
          (hasR1 && !hasR2 && !hasR3) ||
          (!hasR1 && hasR2 && !hasR3) ||
          (!hasR1 && !hasR2 && hasR3)
        )
          return "partial";
        if (
          (hasR1 && hasR2 && !hasR3) ||
          (hasR1 && !hasR2 && hasR3) ||
          (!hasR1 && hasR2 && hasR3)
        )
          return "partial";
        if (hasR1 && hasR2 && hasR3) return "complete";
        return "no-score";
      } else {
        // Day 2 - check if Day 1 is complete first
        const day1Complete =
          team.day1Round1Score !== null &&
          team.day1Round1Score !== undefined &&
          team.day1Round2Score !== null &&
          team.day1Round2Score !== undefined &&
          team.day1Round3Score !== null &&
          team.day1Round3Score !== undefined;

        if (!day1Complete) return "day1-incomplete";

        const hasR1 =
          team.day2Round1Score !== null && team.day2Round1Score !== undefined;
        const hasR2 =
          team.day2Round2Score !== null && team.day2Round2Score !== undefined;
        const hasR3 =
          team.day2Round3Score !== null && team.day2Round3Score !== undefined;
        if (!hasR1 && !hasR2 && !hasR3) return "no-score";
        if (
          (hasR1 && !hasR2 && !hasR3) ||
          (!hasR1 && hasR2 && !hasR3) ||
          (!hasR1 && !hasR2 && hasR3)
        )
          return "partial";
        if (
          (hasR1 && hasR2 && !hasR3) ||
          (hasR1 && !hasR2 && hasR3) ||
          (!hasR1 && hasR2 && hasR3)
        )
          return "partial";
        if (hasR1 && hasR2 && hasR3) return "complete";
        return "no-score";
      }
    }

    // Robosports: placeholder logic (update when implemented)
    if (judgeCategory === "robosports") {
      return team.robosportsScore ? "complete" : "no-score";
    }

    // Future Innovators: one score set
    if (
      judgeCategory === "fi-elem" ||
      judgeCategory === "fi-junior" ||
      judgeCategory === "fi-senior"
    ) {
      return team.totalScore ? "complete" : "no-score";
    }

    // Future Engineers: two rounds with open/obstacle
    if (judgeCategory === "future-eng") {
      if (fePill === "open") {
        const hasR1 = team.openScore1 !== null && team.openScore1 !== undefined;
        const hasR2 = team.openScore2 !== null && team.openScore2 !== undefined;
        if (!hasR1 && !hasR2) return "no-score";
        if (hasR1 && !hasR2) return "round1-only";
        if (hasR1 && hasR2) return "complete";
        return "no-score";
      } else if (fePill === "obstacle") {
        const hasOpen1 =
          team.openScore1 !== null && team.openScore1 !== undefined;
        const hasOpen2 =
          team.openScore2 !== null && team.openScore2 !== undefined;
        if (!hasOpen1 || !hasOpen2) return "not-qualified";
        const hasR1 =
          team.obstacleScore1 !== null && team.obstacleScore1 !== undefined;
        const hasR2 =
          team.obstacleScore2 !== null && team.obstacleScore2 !== undefined;
        if (!hasR1 && !hasR2) return "no-score";
        if (hasR1 && !hasR2) return "round1-only";
        if (hasR1 && hasR2) return "complete";
        return "no-score";
      }
    }

    return "no-score";
  };

  const getCardColor = (status: string) => {
    switch (status) {
      case "no-score":
        return "#faf9f6";
      case "partial":
      case "round1-only":
        return "#fff9c4";
      case "complete":
        return "#c8e6c9";
      case "day1-incomplete":
        return "#ffcccb"; // Light red for day 1 incomplete
      default:
        return "#faf9f6";
    }
  };

  // Get status filter options based on category
  const getStatusFilterOptions = () => {
    const isRoboMissionOrFE =
      judgeCategory === "robo-elem" ||
      judgeCategory === "robo-junior" ||
      judgeCategory === "robo-senior" ||
      judgeCategory === "future-eng";

    if (!isRoboMissionOrFE) {
      return [{ label: "All Teams", value: "all" }];
    }

    // For robo categories, different options based on selected day
    if (
      judgeCategory === "robo-elem" ||
      judgeCategory === "robo-junior" ||
      judgeCategory === "robo-senior"
    ) {
      if (selectedDay === 1) {
        return [
          { label: "All Teams", value: "all" },
          { label: "No Scores Yet", value: "no-score" },
          { label: "Partially Scored", value: "partial" },
          { label: "Day 1 Complete", value: "complete" },
        ];
      } else {
        return [
          { label: "All Teams", value: "all" },
          { label: "Day 1 Incomplete", value: "day1-incomplete" },
          { label: "No Day 2 Scores", value: "no-score" },
          { label: "Partially Scored", value: "partial" },
          { label: "Day 2 Complete", value: "complete" },
        ];
      }
    }

    return [
      { label: "All Teams", value: "all" },
      { label: "No Scores Yet", value: "no-score" },
      { label: "Round 1 Done", value: "round1-only" },
      { label: "Complete", value: "complete" },
    ];
  };

  // Filter teams by status
  const filterTeamsByStatus = (teams: any[]) => {
    if (statusFilter === "all") return teams;
    return teams.filter((team) => getCardStatus(team) === statusFilter);
  };

  // Get status counts for display
  const getStatusCounts = () => {
    const filteredTeams = teams.filter((team) => !team.disabled);
    const counts = {
      total: filteredTeams.length,
      "no-score": 0,
      "round1-only": 0,
      complete: 0,
    };

    filteredTeams.forEach((team) => {
      const status = getCardStatus(team);
      if (counts.hasOwnProperty(status)) {
        counts[status as keyof typeof counts]++;
      }
    });

    return counts;
  };

  // Scoring Modal content based on category
  function renderScorerModalContent() {
    if (!scoringTeam) return null;

    switch (judgeCategory) {
      case "robo-elem":
      case "robo-junior":
      case "robo-senior": {
        return (
          <>
            <Text style={styles.scoreinputTitle}>
              Day {selectedDay} - Round {scoringStep}
            </Text>
            <TextInput
              style={styles.scoreinput}
              placeholder={`Enter Day ${selectedDay} Round ${scoringStep} Score`}
              keyboardType="numeric"
              value={inputScore}
              onChangeText={(text) =>
                setInputScore(text.replace(/[^0-9]/g, ""))
              }
            />
            <View style={styles.timeInputContainer}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 4 }]}
                placeholder="mm"
                keyboardType="numeric"
                value={inputMinute}
                onChangeText={(text) =>
                  setInputMinute(text.replace(/[^0-9]/g, ""))
                }
                maxLength={3}
              />
              <Text style={{ fontSize: 18, color: "#888" }}>:</Text>
              <TextInput
                style={[styles.input, { flex: 1, marginHorizontal: 4 }]}
                placeholder="ss"
                keyboardType="numeric"
                value={inputSecond}
                onChangeText={(text) =>
                  setInputSecond(text.replace(/[^0-9]/g, ""))
                }
                maxLength={3}
              />
              <Text style={{ fontSize: 18, color: "#888" }}>.</Text>
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 4 }]}
                placeholder="ms"
                keyboardType="numeric"
                value={inputMs}
                onChangeText={(text) => setInputMs(text.replace(/[^0-9]/g, ""))}
                maxLength={3}
              />
            </View>
          </>
        );
      }
      case "robosports":
        return null; // Handled in separate component
      case "fi-elem":
      case "fi-junior":
      case "fi-senior": {
        let maxProject = 75,
          maxRobotic = 70,
          maxPresentation = 55;
        if (judgeCategory === "fi-elem") {
          maxProject = 70;
          maxRobotic = 65;
          maxPresentation = 65;
        }

        return (
          <>
            <Text style={styles.scoreinputTitle}>Project & Innovation</Text>
            <TextInput
              style={[
                styles.scoreinput,
                projectError && { borderColor: "red", borderWidth: 2 },
              ]}
              placeholder={`${maxProject}pts max`}
              placeholderTextColor={projectError ? "red" : "#999"}
              keyboardType="numeric"
              value={inputScore}
              onChangeText={(text) => {
                const val = text.replace(/[^0-9]/g, "");
                setInputScore(val);
                setProjectError(Number(val) > maxProject);
              }}
              maxLength={2}
            />
            <Text style={styles.scoreinputTitle}>Robotic Solution</Text>
            <TextInput
              style={[
                styles.scoreinput,
                roboticError && { borderColor: "red", borderWidth: 2 },
              ]}
              placeholder={`${maxRobotic}pts max`}
              placeholderTextColor={roboticError ? "red" : "#999"}
              keyboardType="numeric"
              value={inputMinute}
              onChangeText={(text) => {
                const val = text.replace(/[^0-9]/g, "");
                setInputMinute(val);
                setRoboticError(Number(val) > maxRobotic);
              }}
              maxLength={2}
            />
            <Text style={styles.scoreinputTitle}>
              Presentation & Team Spirit
            </Text>
            <TextInput
              style={[
                styles.scoreinput,
                presentationError && { borderColor: "red", borderWidth: 2 },
              ]}
              placeholder={`${maxPresentation}pts max`}
              placeholderTextColor={presentationError ? "red" : "#999"}
              keyboardType="numeric"
              value={inputSecond}
              onChangeText={(text) => {
                const val = text.replace(/[^0-9]/g, "");
                setInputSecond(val);
                setPresentationError(Number(val) > maxPresentation);
              }}
              maxLength={2}
            />
            <Text style={{ marginTop: 10, fontStyle: "italic" }}>
              Total Score:{" "}
              {Number(inputScore) + Number(inputMinute) + Number(inputSecond)}
            </Text>
          </>
        );
      }
      case "future-eng": {
        const isObstacleRound2 =
          feRoundType === "obstacle" &&
          scoringTeam &&
          scoringTeam.obstacleScore1 != null &&
          (scoringTeam.obstacleScore2 == null || scoringStep === 2);

        const roundStep =
          feRoundType === "open"
            ? scoringTeam.openScore1 == null
              ? 1
              : 2
            : scoringTeam.obstacleScore1 == null
            ? 1
            : 2;

        return (
          <>
            <Text style={styles.scoreinputTitle}>
              {feRoundType === "open"
                ? "Open - Qualifying"
                : "Obstacles - Final"}
            </Text>

            <TextInput
              style={styles.scoreinput}
              placeholder={`Enter ${
                feRoundType === "open" ? "Open" : "Obstacle"
              } Round ${roundStep} Score`}
              keyboardType="numeric"
              value={inputScore}
              onChangeText={(text) =>
                setInputScore(text.replace(/[^0-9]/g, ""))
              }
            />
            <View style={styles.timeInputContainer}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 4 }]}
                placeholder="mm"
                keyboardType="numeric"
                value={inputMinute}
                onChangeText={(text) =>
                  setInputMinute(text.replace(/[^0-9]/g, ""))
                }
                maxLength={1}
              />
              <Text style={{ fontSize: 18, color: "#888" }}>:</Text>
              <TextInput
                style={[styles.input, { flex: 1, marginHorizontal: 4 }]}
                placeholder="ss"
                keyboardType="numeric"
                value={inputSecond}
                onChangeText={(text) =>
                  setInputSecond(text.replace(/[^0-9]/g, ""))
                }
                maxLength={2}
              />
              <Text style={{ fontSize: 18, color: "#888" }}>.</Text>
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 4 }]}
                placeholder="ms"
                keyboardType="numeric"
                value={inputMs}
                onChangeText={(text) => setInputMs(text.replace(/[^0-9]/g, ""))}
                maxLength={3}
              />
            </View>
            {isObstacleRound2 && (
              <>
                <Text style={styles.scoreinputTitle}>
                  Documentation / Github (optional, max 30)
                </Text>
                <TextInput
                  style={styles.scoreinput}
                  placeholder="Documentation / Github"
                  keyboardType="numeric"
                  value={inputDocScore}
                  onChangeText={(text) =>
                    setInputDocScore(text.replace(/[^0-9]/g, ""))
                  }
                  maxLength={2}
                />
              </>
            )}
          </>
        );
      }
    }
  }

  // Best score/time
  function getBestScoreAndTime(team: any) {
    if (selectedDay === 1) {
      const scores = [
        { score: team.day1Round1Score, time: team.day1Round1Time },
        { score: team.day1Round2Score, time: team.day1Round2Time },
        { score: team.day1Round3Score, time: team.day1Round3Time },
      ].filter((r) => r.score != null);

      if (scores.length === 0)
        return { bestScore: null, bestTime: null, bestRound: null };

      const best = scores.reduce((best, current) => {
        if (current.score > best.score) return current;
        if (
          current.score === best.score &&
          parseTimeString(current.time) < parseTimeString(best.time)
        )
          return current;
        return best;
      });

      const bestRound =
        scores.findIndex(
          (s) => s.score === best.score && s.time === best.time
        ) + 1;
      return { bestScore: best.score, bestTime: best.time, bestRound };
    } else {
      const scores = [
        { score: team.day2Round1Score, time: team.day2Round1Time },
        { score: team.day2Round2Score, time: team.day2Round2Time },
        { score: team.day2Round3Score, time: team.day2Round3Time },
      ].filter((r) => r.score != null);

      if (scores.length === 0)
        return { bestScore: null, bestTime: null, bestRound: null };

      const best = scores.reduce((best, current) => {
        if (current.score > best.score) return current;
        if (
          current.score === best.score &&
          parseTimeString(current.time) < parseTimeString(best.time)
        )
          return current;
        return best;
      });

      const bestRound =
        scores.findIndex(
          (s) => s.score === best.score && s.time === best.time
        ) + 1;
      return { bestScore: best.score, bestTime: best.time, bestRound };
    }
  }

  // Helper function to parse time string
  function parseTimeString(timeStr: string) {
    if (!timeStr) return Infinity;
    const parts = timeStr.split(":");
    if (parts.length < 2) return Infinity;
    const [mm, rest] = parts;
    const [ss, ms] = rest.split(".");
    return (
      (Number(mm) || 0) * 60000 +
      (Number(ss) || 0) * 1000 +
      (Number(ms) || 0) * 10
    );
  }

  // Modal open for scoring
  const openScoreModal = (team: any) => {
    if (
      getCardStatus(team) === "complete" ||
      getCardStatus(team) === "day1-incomplete"
    )
      return;

    setScoringTeam(team);

    // Determine which round to score next
    if (selectedDay === 1) {
      if (team.day1Round1Score === null || team.day1Round1Score === undefined) {
        setScoringStep(1);
      } else if (
        team.day1Round2Score === null ||
        team.day1Round2Score === undefined
      ) {
        setScoringStep(2);
      } else {
        setScoringStep(3);
      }
    } else {
      if (team.day2Round1Score === null || team.day2Round1Score === undefined) {
        setScoringStep(1);
      } else if (
        team.day2Round2Score === null ||
        team.day2Round2Score === undefined
      ) {
        setScoringStep(2);
      } else {
        setScoringStep(3);
      }
    }

    setInputScore("");
    setInputMinute("");
    setInputSecond("");
    setInputMs("");
    setScoreModalVisible(true);
  };

  const handleScoreSubmit = async () => {
    setSubmitError("");
    setIsSubmitting(true);

    if (!scoringTeam || !selectedEvent) {
      setIsSubmitting(false);
      return;
    }

    // RoboMission categories (updated to use new structure)
    if (
      judgeCategory === "robo-elem" ||
      judgeCategory === "robo-junior" ||
      judgeCategory === "robo-senior"
    ) {
      const mm = (inputMinute || "0").padStart(2, "0");
      const ss = (inputSecond || "0").padStart(2, "0");
      const ms = (inputMs || "0").padStart(2, "0");
      const inputTime = `${mm}:${ss}.${ms}`;

      if (
        inputScore.trim() === "" ||
        inputMinute.trim() === "" ||
        inputSecond.trim() === "" ||
        inputMs.trim() === ""
      ) {
        setSubmitError("Please input both score and time.");
        setIsSubmitting(false);
        return;
      }

      try {
        const update: any = {
          teamName: scoringTeam.teamName,
          teamId: scoringTeam.id,
          eventId: selectedEvent,
          category: judgeCategory,
          // Preserve existing scores
          day1Round1Score: scoringTeam.day1Round1Score ?? null,
          day1Round1Time: scoringTeam.day1Round1Time ?? null,
          day1Round2Score: scoringTeam.day1Round2Score ?? null,
          day1Round2Time: scoringTeam.day1Round2Time ?? null,
          day1Round3Score: scoringTeam.day1Round3Score ?? null,
          day1Round3Time: scoringTeam.day1Round3Time ?? null,
          day2Round1Score: scoringTeam.day2Round1Score ?? null,
          day2Round1Time: scoringTeam.day2Round1Time ?? null,
          day2Round2Score: scoringTeam.day2Round2Score ?? null,
          day2Round2Time: scoringTeam.day2Round2Time ?? null,
          day2Round3Score: scoringTeam.day2Round3Score ?? null,
          day2Round3Time: scoringTeam.day2Round3Time ?? null,
        };

        const now = new Date();
        const dayPrefix = `day${selectedDay}`;
        const roundField = `${dayPrefix}Round${scoringStep}Score`;
        const timeField = `${dayPrefix}Round${scoringStep}Time`;
        const timestampField = `${dayPrefix}Round${scoringStep}ScoredAt`;

        update[roundField] = Number(inputScore);
        update[timeField] = inputTime;
        update[timestampField] = now.toISOString();

        setScoreModalVisible(false);
        setScoringTeam(null);

        // Save to new structure
        const scoresRef = doc(
          FIREBASE_DB,
          "events",
          selectedEvent,
          "scores",
          scoringTeam.id
        );
        await setDoc(scoresRef, update, { merge: true });

        setTeams((teams) =>
          teams.map((t) => (t.id === scoringTeam.id ? { ...t, ...update } : t))
        );

        setInputScore("");
        setInputMinute("");
        setInputSecond("");
        setInputMs("");
      } catch (e) {
        console.error("Score submission error:", e);
        Alert.alert("Error", "Failed to submit score. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }

    // Future Innovators (updated structure)
    if (
      judgeCategory === "fi-elem" ||
      judgeCategory === "fi-junior" ||
      judgeCategory === "fi-senior"
    ) {
      if (
        inputScore.trim() === "" ||
        inputMinute.trim() === "" ||
        inputSecond.trim() === ""
      ) {
        setSubmitError("Please input all scores.");
        setIsSubmitting(false);
        return;
      }
      if (projectError || roboticError || presentationError) {
        setSubmitError("One or more scores exceed the maximum allowed.");
        setIsSubmitting(false);
        return;
      }

      try {
        const update: any = {
          teamName: scoringTeam.teamName,
          teamId: scoringTeam.id,
          eventId: selectedEvent,
          category: judgeCategory,
          projectInnovation: Number(inputScore),
          roboticSolution: Number(inputMinute),
          presentationSpirit: Number(inputSecond),
          totalScore:
            Number(inputScore) + Number(inputMinute) + Number(inputSecond),
          scoredAt: new Date().toISOString(),
        };

        setScoreModalVisible(false);
        setScoringTeam(null);

        const scoresRef = doc(
          FIREBASE_DB,
          "events",
          selectedEvent,
          "scores",
          scoringTeam.id
        );
        await setDoc(scoresRef, update, { merge: true });

        setTeams((teams) =>
          teams.map((t) => (t.id === scoringTeam.id ? { ...t, ...update } : t))
        );

        setInputScore("");
        setInputMinute("");
        setInputSecond("");
      } catch (e) {
        console.error("Score submission error:", e);
        Alert.alert("Error", "Failed to submit score. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Future Engineers (updated structure)
    if (judgeCategory === "future-eng") {
      if (inputScore.trim() === "") {
        setSubmitError("Please input the score.");
        setIsSubmitting(false);
        return;
      }
      if (
        inputMinute.trim() === "" &&
        inputSecond.trim() === "" &&
        inputMs.trim() === ""
      ) {
        setSubmitError("Please input the time.");
        setIsSubmitting(false);
        return;
      }

      let mm = Number(inputMinute) || 0;
      let ss = Number(inputSecond) || 0;
      let ms = Number(inputMs) || 0;
      let totalMs = mm * 60000 + ss * 1000 + ms;
      const maxMs = 3 * 60 * 1000;
      if (totalMs > maxMs) totalMs = maxMs;

      const cappedMm = Math.floor(totalMs / 60000);
      const cappedSs = Math.floor((totalMs % 60000) / 1000);
      const cappedMs = Math.floor((totalMs % 1000) / 10);
      const inputTime = `${String(cappedMm).padStart(2, "0")}:${String(
        cappedSs
      ).padStart(2, "0")}.${String(cappedMs).padStart(2, "0")}`;

      const docScoreVal =
        inputDocScore.trim() === "" ? 0 : Number(inputDocScore);

      try {
        const update: any = {
          teamName: scoringTeam.teamName,
          teamId: scoringTeam.id,
          eventId: selectedEvent,
          category: judgeCategory,
          docScore: docScoreVal,
        };

        if (feRoundType === "open") {
          if (
            scoringTeam.openScore1 === null ||
            scoringTeam.openScore1 === undefined
          ) {
            update.openScore1 = Number(inputScore);
            update.openTime1 = inputTime;
          } else {
            update.openScore2 = Number(inputScore);
            update.openTime2 = inputTime;
          }
        } else {
          if (
            scoringTeam.obstacleScore1 === null ||
            scoringTeam.obstacleScore1 === undefined
          ) {
            update.obstacleScore1 = Number(inputScore);
            update.obstacleTime1 = inputTime;
          } else {
            update.obstacleScore2 = Number(inputScore);
            update.obstacleTime2 = inputTime;
          }
        }

        const openScores = [
          update.openScore1 ?? scoringTeam.openScore1,
          update.openScore2 ?? scoringTeam.openScore2,
        ].filter((v) => v !== undefined && v !== null);

        const obstacleScores = [
          update.obstacleScore1 ?? scoringTeam.obstacleScore1,
          update.obstacleScore2 ?? scoringTeam.obstacleScore2,
        ].filter((v) => v !== undefined && v !== null);

        update.totalScore =
          Math.max(...openScores, 0) +
          Math.max(...obstacleScores, 0) +
          update.docScore;

        setScoreModalVisible(false);
        setScoringTeam(null);

        const scoresRef = doc(
          FIREBASE_DB,
          "events",
          selectedEvent,
          "scores",
          scoringTeam.id
        );
        await setDoc(scoresRef, update, { merge: true });

        setTeams((teams) =>
          teams.map((t) => (t.id === scoringTeam.id ? { ...t, ...update } : t))
        );

        setInputScore("");
        setInputMinute("");
        setInputDocScore("");
      } catch (e) {
        console.error("Score submission error:", e);
        setSubmitError("Failed to submit score. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
  };

  // RoboSports game card renderer
  const renderGameCard = ({ item: game }: { item: GameData }) => {
    const getStatusColor = () => {
      switch (game.status) {
        case "created":
          return "#faf9f6";
        case "in-progress":
          return "#fff9c4";
        case "finished":
          return "#c8e6c9";
        default:
          return "#faf9f6";
      }
    };

    const getStatusText = () => {
      switch (game.status) {
        case "created":
          return "Ready to Start";
        case "in-progress":
          return `In Progress (Match ${game.currentMatch}/3)`;
        case "finished":
          return "Finished";
        default:
          return "Unknown";
      }
    };

    return (
      <TouchableOpacity
        style={[robostyles.gameCard, { backgroundColor: getStatusColor() }]}
        onPress={() => openGameScorer(game)}
        disabled={game.status === "finished"}
      >
        <Text style={robostyles.gameNumber}>Game #{game.gameNumber}</Text>
        <Text style={robostyles.teamsText}>
          {game.team1Name} vs {game.team2Name}
        </Text>

        <View style={robostyles.gameDetails}>
          <Text style={robostyles.statusText}>Status: {getStatusText()}</Text>

          {game.matchResults.length > 0 && (
            <View style={robostyles.matchResults}>
              <Text style={robostyles.resultsTitle}>Match Results:</Text>
              {game.matchResults.map((result: any, index: number) => (
                <Text key={index} style={robostyles.resultText}>
                  M{result.match}: {result.winner ? result.winnerName : "Tie"} (
                  {result.team1Score} - {result.team2Score})
                </Text>
              ))}
            </View>
          )}

          {game.status === "finished" && (
            <Text style={robostyles.finalResult}>
              Winner:{" "}
              {game.gameWinner
                ? game.gameWinner === game.team1Id
                  ? game.team1Name
                  : game.team2Name
                : "Tie"}{" "}
              ({game.team1Points} - {game.team2Points} pts)
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Create Game Modal
  const renderCreateGameModal = () => (
    <Modal
      visible={showCreateModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCreateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Create New Game</Text>

          <View style={{ marginBottom: 20, zIndex: 1000 }}>
            <Text style={robostyles.label}>Team 1:</Text>
            <DropDownPicker
              open={team1DropdownOpen}
              setOpen={setTeam1DropdownOpen}
              value={selectedTeam1}
              setValue={setSelectedTeam1}
              items={teams.map((team) => ({
                label: `${team.teamNumber} - ${team.teamName}`,
                value: team.id,
              }))}
              placeholder="Select Team 1"
              style={robostyles.dropdown}
              onOpen={() => setTeam2DropdownOpen(false)}
            />
          </View>

          <View style={{ marginBottom: 30, zIndex: 999 }}>
            <Text style={robostyles.label}>Team 2:</Text>
            <DropDownPicker
              open={team2DropdownOpen}
              setOpen={setTeam2DropdownOpen}
              value={selectedTeam2}
              setValue={setSelectedTeam2}
              items={teams
                .filter((t) => t.id !== selectedTeam1)
                .map((team) => ({
                  label: `${team.teamNumber} - ${team.teamName}`,
                  value: team.id,
                }))}
              placeholder="Select Team 2"
              style={robostyles.dropdown}
              onOpen={() => setTeam1DropdownOpen(false)}
            />
          </View>

          <View style={robostyles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={robostyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                robostyles.createButton,
                isCreatingGame && robostyles.disabledButton,
              ]}
              onPress={createNewGame}
              disabled={isCreatingGame || !selectedTeam1 || !selectedTeam2}
            >
              {isCreatingGame ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Create Game</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Show message if no events assigned
  if (assignedEvents.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text style={{ textAlign: "center", fontSize: 16, color: "#666" }}>
          No events assigned to you yet.
        </Text>
        <Text style={{ textAlign: "center", fontSize: 16, color: "#666" }}>
          Please contact the administrator.
        </Text>
      </View>
    );
  }

  // Filter and Sort Teams
  let filteredTeams = teams
    .filter((team) => !team.disabled)
    .filter((team) =>
      team.teamName?.toLowerCase().includes(search.toLowerCase())
    );

  // Apply status filter
  filteredTeams = filterTeamsByStatus(filteredTeams);

  // Future Engineers pill filtering
  if (judgeCategory === "future-eng") {
    if (fePill === "obstacle") {
      filteredTeams = filteredTeams.filter((team) => {
        const hasOpen1 =
          team.openScore1 !== null && team.openScore1 !== undefined;
        const hasOpen2 =
          team.openScore2 !== null && team.openScore2 !== undefined;
        return hasOpen1 && hasOpen2;
      });
    }
  }

  // Sorting (by team number)
  filteredTeams = filteredTeams.sort((a, b) => {
    const aNum = Number(a.teamNumber) || 0;
    const bNum = Number(b.teamNumber) || 0;
    return aNum - bNum;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTeams.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTeams = filteredTeams.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const statusCounts = getStatusCounts();

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ padding: 15 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Score Teams</Text>

          <Text style={styles.headerSubtitle}>
            {judgeCategory === "robosports"
              ? "Create and manage games"
              : "Tap a team card to score"}
          </Text>
        </View>

        {/* Event Selector */}
        <View style={{ marginBottom: 10, zIndex: 1000 }}>
          <Text
            style={{
              fontFamily: "inter_400Regular",
              fontSize: 16,
              fontWeight: "bold",
              marginBottom: 7,
            }}
          >
            Select Event:
          </Text>

          <DropDownPicker
            open={eventDropdownOpen}
            setOpen={setEventDropdownOpen}
            value={selectedEvent}
            setValue={setSelectedEvent}
            items={assignedEvents.map((event) => ({
              label: `${event.title}${event.date ? ` (${event.date})` : ""}`,
              value: event.id,
            }))}
            placeholder="Select Event"
            style={{
              borderWidth: 1,
              borderColor: "#e0e0e0",
              backgroundColor: "#fafafa",
              minHeight: 40,
            }}
            textStyle={{ fontSize: 14 }}
            dropDownContainerStyle={{
              borderWidth: 1,
              borderColor: "#e0e0e0",
              backgroundColor: "#fafafa",
            }}
          />
        </View>

        {/* Current Event Info */}
        {selectedEvent && (
          <View
            style={{
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                fontFamily: "inter_400Regular",
                fontSize: 14,
                fontWeight: "bold",
              }}
            >
              Current Event:{" "}
              {assignedEvents.find((e) => e.id === selectedEvent)?.title}
            </Text>
            <Text
              style={{
                fontFamily: "inter_400Regular",
                fontSize: 12,
                color: "#666",
              }}
            >
              Category: {judgeCategory} •{" "}
              {assignedEvents.find((e) => e.id === selectedEvent)?.date}
            </Text>
          </View>
        )}

        {/* RoboSports Content */}
        {judgeCategory === "robosports" && (
          <View style={{ flex: 1 }}>
            {/* Tournament Mode Toggle */}
            <View style={robostyles.modeToggle}>
              <TouchableOpacity
                style={[
                  robostyles.modeButton,
                  tournamentMode === "regular" && robostyles.modeButtonActive,
                ]}
                onPress={() => setTournamentMode("regular")}
              >
                <Text
                  style={[
                    robostyles.modeButtonText,
                    tournamentMode === "regular" &&
                      robostyles.modeButtonTextActive,
                  ]}
                >
                  Regular Games
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  robostyles.modeButton,
                  tournamentMode === "tournament" &&
                    robostyles.modeButtonActive,
                ]}
                onPress={() => setTournamentMode("tournament")}
              >
                <Text
                  style={[
                    robostyles.modeButtonText,
                    tournamentMode === "tournament" &&
                      robostyles.modeButtonTextActive,
                  ]}
                >
                  Tournament Mode
                </Text>
              </TouchableOpacity>
            </View>

            {/* Regular Games Mode */}
            {tournamentMode === "regular" && (
              <View>
                <TouchableOpacity
                  style={styles.createGameButton}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Text style={[styles.buttonText, { color: "white" }]}>
                    + Create New Game
                  </Text>
                </TouchableOpacity>

                <Text
                  style={[
                    robostyles.gamesHeader,
                    { marginVertical: 15, fontSize: 16, fontWeight: "bold" },
                  ]}
                >
                  Regular Games ({games.filter((g) => !g.tournamentId).length})
                </Text>

                <FlatList
                  data={games.filter((g) => !g.tournamentId)}
                  keyExtractor={(item) => item.id}
                  renderItem={renderGameCard}
                  ListEmptyComponent={
                    <Text style={robostyles.emptyText}>
                      No games created yet. Create your first game!
                    </Text>
                  }
                />
              </View>
            )}

            {/* Tournament Mode */}
            {tournamentMode === "tournament" && (
              <View>
                {/* Create Tournament Button */}
                <TouchableOpacity
                  style={styles.createGameButton}
                  onPress={() => setShowTournamentSetup(true)}
                >
                  <Text style={[styles.buttonText, { color: "white" }]}>
                    + Create Tournament
                  </Text>
                </TouchableOpacity>

                {/* Tournament Selection */}
                {tournaments.length > 0 && (
                  <View style={robostyles.tournamentSelector}>
                    <Text style={robostyles.selectorLabel}>
                      Active Tournaments:
                    </Text>
                    <FlatList
                      data={tournaments}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            robostyles.tournamentCard,
                            selectedTournament?.id === item.id &&
                              robostyles.tournamentCardSelected,
                          ]}
                          onPress={() => setSelectedTournament(item)}
                        >
                          <Text style={robostyles.tournamentName}>
                            {item.name}
                          </Text>
                          <Text style={robostyles.tournamentInfo}>
                            Single Elimination
                          </Text>
                          <Text style={robostyles.tournamentStatus}>
                            Status: {item.status} • {item.teams.length} teams
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                )}

                {/* Ready Tournament Matches */}
                {selectedTournament && (
                  <View>
                    <Text
                      style={[
                        robostyles.gamesHeader,
                        {
                          marginVertical: 15,
                          fontSize: 16,
                          fontWeight: "bold",
                        },
                      ]}
                    >
                      Ready Tournament Matches
                    </Text>

                    <FlatList
                      data={TournamentManager.getReadyMatches(
                        selectedTournament.brackets
                      )}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item: bracket }) => (
                        <TouchableOpacity
                          style={robostyles.tournamentMatchCard}
                          onPress={() => createTournamentGame(bracket)}
                        >
                          <Text style={robostyles.matchTitle}>
                            Round {bracket.roundNumber} - Match{" "}
                            {bracket.matchNumber}
                          </Text>

                          <Text style={robostyles.teamsText}>
                            {bracket.team1Name} vs {bracket.team2Name}
                          </Text>

                          <View style={robostyles.matchStatus}>
                            <Text style={robostyles.statusText}>
                              Ready to Play
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                      ListEmptyComponent={
                        <Text style={robostyles.emptyText}>
                          {selectedTournament.status === "completed"
                            ? "Tournament completed!"
                            : "No matches ready to play."}
                        </Text>
                      }
                    />
                  </View>
                )}

                {/* Tournament Games History */}
                {selectedTournament && (
                  <View>
                    <Text
                      style={[
                        robostyles.gamesHeader,
                        {
                          marginVertical: 15,
                          fontSize: 16,
                          fontWeight: "bold",
                        },
                      ]}
                    >
                      Tournament Games
                    </Text>

                    <FlatList
                      data={games.filter(
                        (g) => g.tournamentId === selectedTournament.id
                      )}
                      keyExtractor={(item) => item.id}
                      renderItem={renderGameCard}
                      ListEmptyComponent={
                        <Text style={robostyles.emptyText}>
                          No tournament games yet.
                        </Text>
                      }
                    />
                  </View>
                )}
              </View>
            )}

            {/* Tournament Setup Modal */}
            <TournamentSetup
              visible={showTournamentSetup}
              onClose={() => setShowTournamentSetup(false)}
              selectedEvent={selectedEvent}
              teams={teams}
              onTournamentCreated={(tournament) => {
                setTournaments((prev) => [...prev, tournament]);
                setSelectedTournament(tournament);
              }}
            />

            {/* Keep your existing modals */}
            {renderCreateGameModal()}

            {activeGame && (
              <RoboSportsMatchScorer
                game={activeGame}
                visible={showScorerModal}
                onClose={() => {
                  setScorerModal(false);
                  setActiveGame(null);
                }}
                selectedEvent={selectedEvent}
              />
            )}
          </View>
        )}

        {/* Non-RoboSports Content */}
        {judgeCategory !== "robosports" && (
          <>
            {/* Status Filter (only for RoboMission and Future Engineers) */}
            {(judgeCategory === "robo-elem" ||
              judgeCategory === "robo-junior" ||
              judgeCategory === "robo-senior" ||
              judgeCategory === "future-eng") && (
              <View style={{ marginBottom: 15, zIndex: 999 }}>
                <Text
                  style={{ fontSize: 14, fontWeight: "bold", marginBottom: 8 }}
                >
                  Filter by Status:
                </Text>
                <DropDownPicker
                  open={statusDropdownOpen}
                  setOpen={setStatusDropdownOpen}
                  value={statusFilter}
                  setValue={setStatusFilter}
                  items={getStatusFilterOptions().map((option) => ({
                    ...option,
                    label: `${option.label}${
                      option.value !== "all"
                        ? ` (${
                            statusCounts[
                              option.value as keyof typeof statusCounts
                            ] || 0
                          })`
                        : ` (${statusCounts.total})`
                    }`,
                  }))}
                  style={{
                    borderWidth: 1,
                    borderColor: "#e0e0e0",
                    backgroundColor: "#fafafa",
                    minHeight: 40,
                  }}
                  textStyle={{ fontSize: 14 }}
                  dropDownContainerStyle={{
                    borderWidth: 1,
                    borderColor: "#e0e0e0",
                    backgroundColor: "#fafafa",
                  }}
                  onChangeValue={() => setCurrentPage(1)}
                />
              </View>
            )}

            {/* Day Tabs for Robo Categories */}
            {(judgeCategory === "robo-elem" ||
              judgeCategory === "robo-junior" ||
              judgeCategory === "robo-senior") && (
              <View style={{ flexDirection: "row", marginBottom: 15 }}>
                <TouchableOpacity
                  style={[
                    styles.fePill,
                    selectedDay === 1 && styles.fePillActive,
                  ]}
                  onPress={() => {
                    setSelectedDay(1);
                    setCurrentPage(1);
                    setStatusFilter("all");
                  }}
                >
                  <Text
                    style={[
                      styles.fePillText,
                      selectedDay === 1 && styles.fePillTextActive,
                    ]}
                  >
                    Day 1
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.fePill,
                    selectedDay === 2 && styles.fePillActive,
                    // Disable day 2 if no teams have completed day 1
                    !teams.some(
                      (team) =>
                        team.day1Round1Score != null &&
                        team.day1Round2Score != null &&
                        team.day1Round3Score != null
                    ) && { opacity: 0.5 },
                  ]}
                  onPress={() => {
                    // Check if any team has completed day 1
                    const hasDay1Complete = teams.some(
                      (team) =>
                        team.day1Round1Score != null &&
                        team.day1Round2Score != null &&
                        team.day1Round3Score != null
                    );

                    if (hasDay1Complete) {
                      setSelectedDay(2);
                      setCurrentPage(1);
                      setStatusFilter("all");
                    } else {
                      Alert.alert(
                        "Day 2 Locked",
                        "Complete Day 1 scoring for at least one team to unlock Day 2."
                      );
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.fePillText,
                      selectedDay === 2 && styles.fePillTextActive,
                    ]}
                  >
                    Day 2
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Search Bar */}
            <TextInput
              style={styles.searchbar}
              placeholder="Search team name..."
              placeholderTextColor="#999999"
              value={search}
              onChangeText={(text) => {
                setSearch(text);
                setCurrentPage(1);
              }}
            />

            {/* Future Engineers Pills */}
            {judgeCategory === "future-eng" && (
              <View style={{ flexDirection: "row", marginBottom: 12 }}>
                <TouchableOpacity
                  style={[
                    styles.fePill,
                    fePill === "open" && styles.fePillActive,
                  ]}
                  onPress={() => setFePill("open")}
                >
                  <Text
                    style={[
                      styles.fePillText,
                      fePill === "open" && styles.fePillTextActive,
                    ]}
                  >
                    {" "}
                    Open - Qualifying
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.fePill,
                    fePill === "obstacle" && styles.fePillActive,
                  ]}
                  onPress={() => setFePill("obstacle")}
                >
                  <Text
                    style={[
                      styles.fePillText,
                      fePill === "obstacle" && styles.fePillTextActive,
                    ]}
                  >
                    Obstacles - Final
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 15,
                }}
              >
                <TouchableOpacity
                  style={[
                    {
                      padding: 8,
                      marginHorizontal: 5,
                      borderRadius: 5,
                      backgroundColor: "#e0e0e0",
                    },
                    currentPage === 1 && { opacity: 0.5 },
                  ]}
                  onPress={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                >
                  <Text>Previous</Text>
                </TouchableOpacity>

                <Text style={{ marginHorizontal: 15, fontSize: 16 }}>
                  Page {currentPage} of {totalPages} ({filteredTeams.length}{" "}
                  teams)
                </Text>

                <TouchableOpacity
                  style={[
                    {
                      padding: 8,
                      marginHorizontal: 5,
                      borderRadius: 5,
                      backgroundColor: "#e0e0e0",
                    },
                    currentPage === totalPages && { opacity: 0.5 },
                  ]}
                  onPress={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <Text>Next</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Teams List */}
            <FlatList
              data={paginatedTeams}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const status = getCardStatus(item);
                const isComplete = status === "complete";
                const { bestScore, bestTime, bestRound } =
                  getBestScoreAndTime(item);

                // RoboMission: current UI
                if (
                  judgeCategory === "robo-elem" ||
                  judgeCategory === "robo-junior" ||
                  judgeCategory === "robo-senior"
                ) {
                  const currentDayScores =
                    selectedDay === 1
                      ? [
                          {
                            score: item.day1Round1Score,
                            time: item.day1Round1Time,
                          },
                          {
                            score: item.day1Round2Score,
                            time: item.day1Round2Time,
                          },
                          {
                            score: item.day1Round3Score,
                            time: item.day1Round3Time,
                          },
                        ]
                      : [
                          {
                            score: item.day2Round1Score,
                            time: item.day2Round1Time,
                          },
                          {
                            score: item.day2Round2Score,
                            time: item.day2Round2Time,
                          },
                          {
                            score: item.day2Round3Score,
                            time: item.day2Round3Time,
                          },
                        ];
                  return (
                    <Pressable
                      disabled={isComplete || status === "day1-incomplete"}
                      onPress={() => openScoreModal(item)}
                      style={({ pressed }) => [
                        styles.teamCard,
                        {
                          backgroundColor: getCardColor(status),
                          opacity:
                            isComplete || status === "day1-incomplete"
                              ? 0.7
                              : 1,
                        },
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Text style={styles.teamCardTeamNumber}>
                        Team no. {item.teamNumber}
                      </Text>
                      <Text style={styles.teamCardTitle}>{item.teamName}</Text>
                      <View
                        style={{
                          borderBottomWidth: 1,
                          borderColor: "#bcbcbcff",
                          paddingVertical: 10,
                          marginBottom: 10,
                        }}
                      >
                        <View style={{ flexDirection: "row" }}>
                          {/* Round column */}
                          <View style={{ flex: 1 }}>
                            {currentDayScores.map((round, index) => (
                              <Text key={index} style={styles.teamData}>
                                Round {index + 1}:{" "}
                                <Text
                                  style={
                                    bestRound === index + 1
                                      ? { color: "#388e3c", fontWeight: "bold" }
                                      : {}
                                  }
                                >
                                  {round.score ?? "—"}
                                </Text>
                              </Text>
                            ))}
                          </View>
                          {/* Time column */}
                          <View style={{ flex: 1 }}>
                            {currentDayScores.map((round, index) => (
                              <Text key={index} style={styles.teamData}>
                                Time {index + 1}:{" "}
                                <Text
                                  style={
                                    bestRound === index + 1
                                      ? { color: "#1976d2", fontWeight: "bold" }
                                      : {}
                                  }
                                >
                                  {round.time ?? "—"}
                                </Text>
                              </Text>
                            ))}
                          </View>
                        </View>
                      </View>
                      <Text
                        style={{
                          fontFamily: "inter_400Regular",
                          fontStyle: "italic",
                          color: "#6B7280",
                        }}
                      >
                        Status:{" "}
                        {status === "no-score"
                          ? "No Score yet"
                          : status === "partial"
                          ? "Partially Scored"
                          : status === "complete"
                          ? `Day ${selectedDay} Complete`
                          : status === "day1-incomplete"
                          ? "Complete Day 1 First"
                          : "Complete"}
                      </Text>
                    </Pressable>
                  );
                }

                // Future Innovators: show individual scores
                if (
                  judgeCategory === "fi-elem" ||
                  judgeCategory === "fi-junior" ||
                  judgeCategory === "fi-senior"
                ) {
                  return (
                    <Pressable
                      disabled={isComplete}
                      onPress={() => openScoreModal(item)}
                      style={({ pressed }) => [
                        styles.teamCard,
                        {
                          backgroundColor: getCardColor(status),
                          opacity: isComplete ? 1 : 1,
                        },
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Text style={styles.teamCardTeamNumber}>
                        Team no. {item.teamNumber}
                      </Text>
                      <Text style={styles.teamCardTitle}>{item.teamName}</Text>
                      <View style={{ marginVertical: 10 }}>
                        <Text style={styles.teamData}>
                          Project & Innovation:{" "}
                          <Text
                            style={{ fontWeight: "bold", color: "#432344" }}
                          >
                            {item.projectInnovation ?? "—"}
                          </Text>
                        </Text>
                        <Text style={styles.teamData}>
                          Robotic Solution:{" "}
                          <Text
                            style={{ fontWeight: "bold", color: "#432344" }}
                          >
                            {item.roboticSolution ?? "—"}
                          </Text>
                        </Text>
                        <Text style={styles.teamData}>
                          Presentation & Team Spirit:{" "}
                          <Text
                            style={{ fontWeight: "bold", color: "#432344" }}
                          >
                            {item.presentationSpirit ?? "—"}
                          </Text>
                        </Text>
                        <Text
                          style={[
                            styles.teamData,
                            { marginTop: 6, fontStyle: "italic" },
                          ]}
                        >
                          Total Score:{" "}
                          <Text
                            style={{ fontWeight: "bold", color: "#388e3c" }}
                          >
                            {item.totalScore ?? "—"}
                          </Text>
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontFamily: "inter_400Regular",
                          fontStyle: "italic",
                          color: "#6B7280",
                        }}
                      >
                        Status: {item.totalScore ? "Scored" : "No Score yet"}
                      </Text>
                    </Pressable>
                  );
                }

                // Future Engineers
                if (judgeCategory === "future-eng") {
                  const status = getCardStatus(item);
                  const isComplete = status === "complete";
                  const isNotQualified = status === "not-qualified";
                  let cardStatusText = "";
                  if (fePill === "open") {
                    cardStatusText =
                      status === "no-score"
                        ? "No Score yet"
                        : status === "round1-only"
                        ? "Round 1 Done"
                        : "Complete";
                  } else {
                    cardStatusText = isNotQualified
                      ? "Not qualified yet"
                      : status === "no-score"
                      ? "No Score yet"
                      : status === "round1-only"
                      ? "Round 1 Done"
                      : "Complete";
                  }

                  // For obstacle, disable if not qualified or complete
                  const isCardDisabled =
                    (fePill === "obstacle" && (isNotQualified || isComplete)) ||
                    (fePill === "open" && isComplete);

                  // For open, show openScore/time; for obstacle, show obstacleScore/time
                  const score1 =
                    fePill === "open" ? item.openScore1 : item.obstacleScore1;
                  const score2 =
                    fePill === "open" ? item.openScore2 : item.obstacleScore2;
                  const time1 =
                    fePill === "open" ? item.openTime1 : item.obstacleTime1;
                  const time2 =
                    fePill === "open" ? item.openTime2 : item.obstacleTime2;

                  // For open rounds
                  const openScores = [
                    { score: item.openScore1, time: item.openTime1 },
                    { score: item.openScore2, time: item.openTime2 },
                  ].filter((v) => v.score != null);

                  let maxOpenScore: any | null = null;
                  let minOpenTime = null;
                  if (openScores.length) {
                    maxOpenScore = Math.max(...openScores.map((v) => v.score));
                    // Find all rounds with max score, pick the one with the lowest time
                    const tied = openScores.filter(
                      (v) => v.score === maxOpenScore
                    );
                    minOpenTime =
                      tied.length > 1
                        ? tied.reduce(
                            (min, curr) =>
                              parseTimeStringToMs(curr.time) <
                              parseTimeStringToMs(min.time)
                                ? curr
                                : min,
                            tied[0]
                          ).time
                        : tied[0].time;
                  }

                  // For obstacle rounds
                  const obsScores = [
                    { score: item.obstacleScore1, time: item.obstacleTime1 },
                    { score: item.obstacleScore2, time: item.obstacleTime2 },
                  ].filter((v) => v.score != null);

                  let maxObsScore: any | null = null;
                  let minObsTime = null;
                  if (obsScores.length) {
                    maxObsScore = Math.max(...obsScores.map((v) => v.score));
                    const tied = obsScores.filter(
                      (v) => v.score === maxObsScore
                    );
                    minObsTime =
                      tied.length > 1
                        ? tied.reduce(
                            (min, curr) =>
                              parseTimeStringToMs(curr.time) <
                              parseTimeStringToMs(min.time)
                                ? curr
                                : min,
                            tied[0]
                          ).time
                        : tied[0].time;
                  }

                  return (
                    <Pressable
                      disabled={isCardDisabled}
                      onPress={() => {
                        setFeRoundType(fePill);
                        openScoreModal(item);
                      }}
                      style={({ pressed }) => [
                        styles.teamCard,
                        {
                          backgroundColor: getCardColor(status),
                          opacity: isCardDisabled ? 0.7 : 1,
                        },
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Text style={styles.teamCardTeamNumber}>
                        Team no. {item.teamNumber}
                      </Text>
                      <Text style={styles.teamCardTitle}>{item.teamName}</Text>
                      <View
                        style={{
                          borderBottomWidth: 1,
                          borderColor: "#bcbcbcff",
                          paddingVertical: 10,
                          marginBottom: 10,
                        }}
                      >
                        <View style={{ flexDirection: "row" }}>
                          {/* Round column in fe */}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.teamData}>
                              Round 1:{" "}
                              <Text
                                style={
                                  score1 != null &&
                                  ((fePill === "open" &&
                                    score1 === maxOpenScore &&
                                    time1 === minOpenTime) ||
                                    (fePill === "obstacle" &&
                                      score1 === maxObsScore &&
                                      time1 === minObsTime))
                                    ? {
                                        color: "#388e3c",
                                        fontWeight: "bold",
                                        textDecorationLine: "underline",
                                      }
                                    : {}
                                }
                              >
                                {score1 ? score1 : "—"}
                              </Text>
                            </Text>
                            <Text style={styles.teamData}>
                              Round 2:{" "}
                              <Text
                                style={
                                  score2 != null &&
                                  ((fePill === "open" &&
                                    score2 === maxOpenScore &&
                                    time2 === minOpenTime) ||
                                    (fePill === "obstacle" &&
                                      score2 === maxObsScore &&
                                      time2 === minObsTime))
                                    ? {
                                        color: "#388e3c",
                                        fontWeight: "bold",
                                        textDecorationLine: "underline",
                                      }
                                    : {}
                                }
                              >
                                {score2 ? score2 : "—"}
                              </Text>
                            </Text>
                          </View>
                          {/* Time column in fe*/}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.teamData}>
                              Time 1:{" "}
                              <Text
                                style={
                                  time1 != null
                                    ? { color: "#1976d2", fontWeight: "bold" }
                                    : {}
                                }
                              >
                                {time1 ? time1 : "—"}
                              </Text>
                            </Text>
                            <Text style={styles.teamData}>
                              Time 2:{" "}
                              <Text
                                style={
                                  time2 != null
                                    ? { color: "#1976d2", fontWeight: "bold" }
                                    : {}
                                }
                              >
                                {time2 ? time2 : "—"}
                              </Text>
                            </Text>
                          </View>
                        </View>
                        {/* Documentation only for obstacle */}
                        {fePill === "obstacle" && (
                          <Text style={styles.teamData}>
                            Documentation:{" "}
                            <Text
                              style={{ fontWeight: "bold", color: "#432344" }}
                            >
                              {item.docScore ?? "—"}
                            </Text>
                          </Text>
                        )}
                      </View>
                      <Text
                        style={{
                          fontFamily: "inter_400Regular",
                          fontStyle: "italic",
                          color: "#6B7280",
                        }}
                      >
                        Status: {cardStatusText}
                      </Text>
                    </Pressable>
                  );
                }

                // Default fallback
                return (
                  <View style={styles.teamCard}>
                    <Text style={styles.teamCardTitle}>{item.teamName}</Text>
                    <Text style={{ fontStyle: "italic", color: "#888" }}>
                      No Teams in this category.
                    </Text>
                  </View>
                );
              }}
            />
          </>
        )}

        {/* Scorer Modal */}
        <Modal
          visible={scoreModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setScoreModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{scoringTeam?.teamName}</Text>
              {renderScorerModalContent()}
              {submitError ? (
                <Text style={{ color: "red", marginVertical: 8 }}>
                  {submitError}
                </Text>
              ) : null}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    isSubmitting && { opacity: 0.5 },
                  ]}
                  onPress={() => {
                    setScoreModalVisible(false);
                    setSubmitError("");
                  }}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.buttonText, { color: "#432344" }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    isSubmitting && { opacity: 0.7 },
                  ]}
                  onPress={handleScoreSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <ActivityIndicator
                        size="small"
                        color="white"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.buttonText}>Submitting...</Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}
