import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  getFirestore,
  collection,
  onSnapshot,
  getDocs,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { FIREBASE_AUTH, FIREBASE_DB } from "../firebaseconfig";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import styles from "../components/styles/judgeStyles/LeaderboardStyling";
import DropDownPicker from "react-native-dropdown-picker";
import { Feather } from "@expo/vector-icons";

// Helper to parse "mm:ss:ms" to milliseconds
function parseTimeString(timeStr: string) {
  if (!timeStr) return Infinity;
  const [mm, ss, ms] = timeStr.split(":").map(Number);
  return (mm || 0) * 60000 + (ss || 0) * 1000 + (ms || 0);
}

// Helper function to determine if scoring is complete based on category
function isScoringComplete(teamData: any, category: string): boolean {
  if (!teamData || !category) return false;

  const categoryLower = category.toLowerCase();

  // Robo categories (elem, jr, sr) - NEW: Check both days
  if (categoryLower.includes('robo-elem') || categoryLower.includes('robo-junior') || categoryLower.includes('robo-senior')) {
    // Day 1 must be complete (all 3 rounds)
    const day1Complete = teamData.day1Round1Score != null && 
                        teamData.day1Round2Score != null && 
                        teamData.day1Round3Score != null;
    
    // Day 2 must be complete (all 3 rounds)
    const day2Complete = teamData.day2Round1Score != null && 
                        teamData.day2Round2Score != null && 
                        teamData.day2Round3Score != null;
    
    return day1Complete && day2Complete;
  }

  // Robosports - placeholder for future alterations
  if (categoryLower.includes('robosports')) {
    // Currently using same logic as robo categories, but structured for easy modification
    return teamData.round1Score != null && teamData.round2Score != null;
  }

  // FI categories (elem, jr, sr)
  if (categoryLower.includes('fi-elem') || categoryLower.includes('fi-junior') || categoryLower.includes('fi-senior')) {
    // All three components must be present
    return teamData.presentationSpirit != null && 
           teamData.projectInnovation != null && 
           teamData.roboticSolution != null;
  }

  // Future Engineering
  if (categoryLower.includes('future eng') || categoryLower.includes('future-eng')) {
    // All four rounds must be filled
    return teamData.openScore1 != null && 
           teamData.openScore2 != null && 
           teamData.obstacleScore1 != null && 
           teamData.obstacleScore2 != null;
  }

  // Default fallback for unknown categories
  return teamData.round1Score != null && teamData.round2Score != null;
}

// Helper function to get completion status for a team based on category
function getTeamCompletionData(teamData: any, category: string) {
  const categoryLower = category.toLowerCase();

  if (categoryLower.includes('robo-elem') || categoryLower.includes('robo-junior') || categoryLower.includes('robo-senior')) {
    // NEW: Day 1 and Day 2 completion tracking
    const day1Complete = teamData.day1Round1Score != null && 
                         teamData.day1Round2Score != null && 
                         teamData.day1Round3Score != null;
    
    const day2Complete = teamData.day2Round1Score != null && 
                         teamData.day2Round2Score != null && 
                         teamData.day2Round3Score != null;

    return {
      hasDay1Round1: teamData.day1Round1Score != null,
      hasDay1Round2: teamData.day1Round2Score != null,
      hasDay1Round3: teamData.day1Round3Score != null,
      hasDay2Round1: teamData.day2Round1Score != null,
      hasDay2Round2: teamData.day2Round2Score != null,
      hasDay2Round3: teamData.day2Round3Score != null,
      day1Complete,
      day2Complete,
      isComplete: day1Complete && day2Complete
    };
  }

  if (categoryLower.includes('robosports')) {
    return {
      hasRound1: teamData.round1Score != null,
      hasRound2: teamData.round2Score != null,
      isComplete: teamData.round1Score != null && teamData.round2Score != null
    };
  }

  if (categoryLower.includes('fi-elem') || categoryLower.includes('fi-junior') || categoryLower.includes('fi-senior')) {
    return {
      hasPresentationSpirit: teamData.presentationSpirit != null,
      hasProjectInnovation: teamData.projectInnovation != null,
      hasRoboticSolution: teamData.roboticSolution != null,
      isComplete: teamData.presentationSpirit != null && 
                  teamData.projectInnovation != null && 
                  teamData.roboticSolution != null
    };
  }

  if (categoryLower.includes('future eng') || categoryLower.includes('future-eng')) {
    return {
      hasOpenRound1: teamData.openScore1 != null,
      hasOpenRound2: teamData.openScore2 != null,
      hasObstacleRound1: teamData.obstacleScore1 != null,
      hasObstacleRound2: teamData.obstacleScore2 != null,
      hasDocScore: teamData.docScore != null,
      isComplete: teamData.openScore1 != null && 
                  teamData.openScore2 != null && 
                  teamData.obstacleScore1 != null && 
                  teamData.obstacleScore2 != null &&
                  teamData.docScore != null
    };
  }

  // Default fallback
  return {
    hasRound1: teamData.round1Score != null,
    hasRound2: teamData.round2Score != null,
    isComplete: teamData.round1Score != null && teamData.round2Score != null
  };
}

export default function Leaderboard({ navigation }: any) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [judgeCategory, setJudgeCategory] = useState<string | null>(null);
  const [judgeId, setJudgeId] = useState<string | null>(null);
  
  // Event states
  const [assignedEvents, setAssignedEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);
  
  // Status tracking states
  const [totalTeams, setTotalTeams] = useState<number>(0);
  const [scoredTeams, setScoredTeams] = useState<number>(0);
  const [completeTeams, setCompleteTeams] = useState<number>(0);
  const [scoringStatus, setScoringStatus] = useState<string>("");

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

  useEffect(() => {
    // Fetch judge's assigned category and events
    const fetchJudgeData = async () => {
      const user = FIREBASE_AUTH.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(FIREBASE_DB, "judge-users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const category = data.category || null;
          setJudgeCategory(category);
          setJudgeId(user.uid);

          // Fetch events where this judge is assigned to this category
          const eventsRef = collection(FIREBASE_DB, "events");
          const eventsSnapshot = await getDocs(eventsRef);
          
          const judgeEvents: any[] = [];
          eventsSnapshot.forEach((eventDoc) => {
            const eventData = eventDoc.data();
            const categoryData = eventData.categoryData;
            
            // Check if judge is assigned to this event's category
            if (categoryData && categoryData[category] && categoryData[category].judges) {
              const assignedJudges = categoryData[category].judges || [];
              if (assignedJudges.includes(user.uid)) {
                judgeEvents.push({
                  id: eventDoc.id,
                  title: eventData.title || "Untitled Event",
                  date: eventData.date || "",
                  ...eventData
                });
              }
            }
          });

          // Sort by date (newest first)
          judgeEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setAssignedEvents(judgeEvents);
          
          // Auto-select first event if available
          if (judgeEvents.length > 0) {
            setSelectedEvent(judgeEvents[0].id);
          }
        }
      }
    };
    fetchJudgeData();
  }, []);

  useEffect(() => {
    if (!judgeCategory || !selectedEvent) {
      setLoading(false);
      return;
    }

    const db = getFirestore();

    // First, get the total number of teams assigned to this event and category
    const fetchTotalTeams = async () => {
      try {
        const eventDoc = await getDoc(doc(db, "events", selectedEvent));
        if (eventDoc.exists()) {
          const eventData = eventDoc.data();
          const categoryData = eventData.categoryData;
          
          if (categoryData && categoryData[judgeCategory] && categoryData[judgeCategory].teams) {
            const assignedTeams = categoryData[judgeCategory].teams || [];
            setTotalTeams(assignedTeams.length);
          } else {
            setTotalTeams(0);
          }
        }
      } catch (error) {
        console.error("Error fetching total teams:", error);
        setTotalTeams(0);
      }
    };

    fetchTotalTeams();

    // Query scores for the selected event and judge's category
    const scoresRef = collection(db, "events", selectedEvent, "scores");
    const unsubscribeScores = onSnapshot(scoresRef, (scoresSnap) => {
      const teamMap: Record<string, any> = {};
      let teamsWithAnyScore = 0;
      let teamsCompletelyScored = 0;

      scoresSnap.forEach((doc) => {
        const data = doc.data();
        // Filter by category
        if (data.category === judgeCategory) {
          if (!teamMap[data.teamId]) {
            teamMap[data.teamId] = {
              teamName: data.teamName,
              teamId: data.teamId,
              ...data // Include all score data
            };
          }
        }
      });

      // Count teams and determine completion status
      const teamValues = Object.values(teamMap);
      teamsWithAnyScore = teamValues.length;
      
      teamValues.forEach((team) => {
        if (isScoringComplete(team, judgeCategory)) {
          teamsCompletelyScored++;
        }
      });

      // Update state
      setScoredTeams(teamsWithAnyScore);
      setCompleteTeams(teamsCompletelyScored);

      // Update scoring status based on completion
      if (teamsWithAnyScore === 0) {
        setScoringStatus("No scores submitted yet");
      } else if (teamsCompletelyScored < totalTeams) {
        setScoringStatus("Scoring in progress, ranking is not yet finalized");
      } else {
        setScoringStatus("Scoring done! This is the finalized ranking");
      }

      // Calculate best scores and times for ranking
      Object.values(teamMap).forEach((team) => {
        const categoryLower = judgeCategory.toLowerCase();
        
        if (categoryLower.includes('robo-elem') || categoryLower.includes('robo-junior') || categoryLower.includes('robo-senior')) {
          // NEW: Handle day 1 and day 2 scoring
          const day1Scores = [
            { score: team.day1Round1Score, time: team.day1Round1Time },
            { score: team.day1Round2Score, time: team.day1Round2Time },
            { score: team.day1Round3Score, time: team.day1Round3Time }
          ].filter(r => r.score != null);

          const day2Scores = [
            { score: team.day2Round1Score, time: team.day2Round1Time },
            { score: team.day2Round2Score, time: team.day2Round2Time },
            { score: team.day2Round3Score, time: team.day2Round3Time }
          ].filter(r => r.score != null);

          // Find best run from day 1 (highest score, then lowest time)
          let day1Best = null;
          if (day1Scores.length > 0) {
            day1Best = day1Scores.reduce((best, current) => {
              if (current.score > best.score) return current;
              if (current.score === best.score && parseTimeString(current.time) < parseTimeString(best.time)) return current;
              return best;
            });
          }

          // Find best run from day 2 (highest score, then lowest time)
          let day2Best = null;
          if (day2Scores.length > 0) {
            day2Best = day2Scores.reduce((best, current) => {
              if (current.score > best.score) return current;
              if (current.score === best.score && parseTimeString(current.time) < parseTimeString(best.time)) return current;
              return best;
            });
          }

          // Calculate total score (sum of best from each day)
          const day1BestScore = day1Best ? day1Best.score : 0;
          const day2BestScore = day2Best ? day2Best.score : 0;
          team.bestScore = day1BestScore + day2BestScore;
          
          // For tie-breaking, use combined time (sum of best times from both days)
          const day1BestTime = day1Best ? parseTimeString(day1Best.time) : 0;
          const day2BestTime = day2Best ? parseTimeString(day2Best.time) : 0;
          team.bestTimeMs = day1BestTime + day2BestTime;
          
          // Display format for best time
          team.bestTime = `${day1BestScore}+${day2BestScore}=${team.bestScore}`;
          
          // Store individual day best scores for display
          team.day1BestScore = day1BestScore;
          team.day2BestScore = day2BestScore;
          team.day1BestTime = day1Best ? day1Best.time : "";
          team.day2BestTime = day2Best ? day2Best.time : "";
          
        } else if (categoryLower.includes('robosports')) {
          // Handle robo categories with rounds and times
          const r1 = team.round1Score ?? null;
          const r2 = team.round2Score ?? null;
          const t1 = team.time1 ?? "";
          const t2 = team.time2 ?? "";
          
          if (r1 !== null && (r2 === null || r1 >= r2)) {
            team.bestScore = r1;
            team.bestTime = t1;
            team.bestTimeMs = parseTimeString(t1);
          }
          if (r2 !== null && (r1 === null || r2 > r1)) {
            team.bestScore = r2;
            team.bestTime = t2;
            team.bestTimeMs = parseTimeString(t2);
          }
        } else if (categoryLower.includes('fi-')) {
          // Handle FI categories - sum all components
          const presentation = team.presentationSpirit ?? 0;
          const innovation = team.projectInnovation ?? 0;
          const solution = team.roboticSolution ?? 0;
          team.bestScore = presentation + innovation + solution;
          team.bestTime = ""; // No time component for FI
          team.bestTimeMs = 0;
        } else if (categoryLower.includes('future-eng') || categoryLower.includes('future-eng')) {
          // Handle Future Engineering - highest open + highest obstacle + docScore
          const open1 = team.openScore1 ?? 0;
          const open2 = team.openScore2 ?? 0;
          const obstacle1 = team.obstacleScore1 ?? 0;  // Fixed typo from obstaclScore1
          const obstacle2 = team.obstacleScore2 ?? 0;
          const docScore = team.docScore ?? 0;
          
          const highestOpen = Math.max(open1, open2);
          const highestObstacle = Math.max(obstacle1, obstacle2);
          
          team.bestScore = highestOpen + highestObstacle + docScore;
          
          // For tie-breaking, use the time from the round that gave the highest total
          // Determine which combination gave the best score
          const combo1Time = (open1 >= open2 ? team.openTime1 : team.openTime2) || "";
          const combo2Time = (obstacle1 >= obstacle2 ? team.obstacleTime1 : team.obstacleTime2) || "";
          
          // Use the slower time for tie-breaking (since we want better time to win)
          const time1Ms = parseTimeString(combo1Time);
          const time2Ms = parseTimeString(combo2Time);
          const combinedTimeMs = Math.max(time1Ms, time2Ms);
          
          team.bestTime = combinedTimeMs === time1Ms ? combo1Time : combo2Time;
          team.bestTimeMs = combinedTimeMs;
        }
      });

      const leaderboardArr = Object.values(teamMap)
        .filter((team) => team.bestScore !== undefined && team.bestScore !== null)
        .sort((a, b) => {
          const aScore = a.bestScore ?? -Infinity;
          const bScore = b.bestScore ?? -Infinity;
          if (bScore !== aScore) return bScore - aScore;
          return (a.bestTimeMs ?? Infinity) - (b.bestTimeMs ?? Infinity);
        })
        .slice(0, 8);

      setLeaderboard(leaderboardArr);
      setLoading(false);
    },
    (error) => {
      console.error("Error fetching scores:", error);
      setLeaderboard([]);
      setLoading(false);
    });

    return () => {
      unsubscribeScores();
    };
  }, [judgeCategory, selectedEvent, totalTeams]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Show message if no events assigned
  if (assignedEvents.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ textAlign: "center", fontSize: 16, color: "#666" }}>
          No events assigned to you yet. Please contact the administrator.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Event Selector */}
      <View style={{ marginBottom: 20, zIndex: 1000 }}>
        <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
          Select Event:
        </Text>
        <DropDownPicker
          open={eventDropdownOpen}
          setOpen={setEventDropdownOpen}
          value={selectedEvent}
          setValue={setSelectedEvent}
          items={assignedEvents.map(event => ({
            label: `${event.title}${event.date ? ` (${event.date})` : ''}`,
            value: event.id,
          }))}
          placeholder="Select Event"
          style={{
            borderWidth: 1,
            borderColor: "#e0e0e0",
            backgroundColor: "#fafafa",
            minHeight: 40,
          }}
          textStyle={{
            fontSize: 14,
          }}
          dropDownContainerStyle={{
            borderWidth: 1,
            borderColor: "#e0e0e0",
            backgroundColor: "#fafafa",
          }}
        />
      </View>

      {/* Current Event Info */}
      {selectedEvent && (
        <View style={{ marginBottom: 15, padding: 10, backgroundColor: "#f0f0f0", borderRadius: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: "bold" }}>
            Current Event: {assignedEvents.find(e => e.id === selectedEvent)?.title}
          </Text>
          <Text style={{ fontSize: 12, color: "#666" }}>
            Category: {judgeCategory} • {assignedEvents.find(e => e.id === selectedEvent)?.date}
          </Text>
          
          {/* Status Details */}
          <View style={{ marginTop: 8, padding: 8, backgroundColor: "#fff", borderRadius: 6 }}>
            <Text style={{ 
              fontSize: 12, 
              fontWeight: "bold",
              color: scoringStatus.includes("finalized") ? "#2d5a3d" : "#b8860b",
              marginBottom: 2
            }}>
              Status: {scoringStatus}
            </Text>
            <Text style={{ fontSize: 11, color: "#666" }}>
              Teams with scores: {scoredTeams}/{totalTeams}
            </Text>
            <Text style={{ fontSize: 11, color: "#666" }}>
              Teams completely scored: {completeTeams}/{totalTeams}
            </Text>
          </View>
        </View>
      )}
      
      {/* Header */}
      <TouchableOpacity
        onPress={() => navigation.navigate("AllLeaderboardScreen", { 
          eventId: selectedEvent,
          eventTitle: assignedEvents.find(e => e.id === selectedEvent)?.title 
        })}
      >
        <Text
          style={{
            color: "blue",
            fontFamily: "Inter_400Regular",
            marginBottom: 10,
          }}
        >
          View All Rankings
        </Text>
      </TouchableOpacity>
      
      {leaderboard.length === 0 ? (
        <Text>No scores yet for this event!</Text>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.teamId}
          renderItem={({ item, index }) => {
            const rankColors = ["#F8AA0C", "#3A9F6C", "#0081CC"];
            const isTopThree = index < 3;
            const cardBg = rankColors[index] || "#fff";
            const textColor = isTopThree ? "#fff" : "#000";
            const rankIcons = ["🥇", "🥈", "🥉"];
            const rankDisplay = isTopThree
              ? rankIcons[index]
              : `${index + 1}.`;

            return (
              <View
                style={[styles.containerCard, { backgroundColor: cardBg }]}
              >
                <Text
                  style={{
                    width: 25,
                    textAlign: "center",
                    fontFamily: "Inter_400Regular",
                    fontWeight: isTopThree ? "700" : "500",
                    fontSize: isTopThree ? 20 : 14,
                    color: textColor,
                    marginRight: 5,
                    marginVertical: "auto",
                    textShadowColor: "rgba(0,0,0,0.5)",
                    textShadowRadius: 2,
                  }}
                >
                  {rankDisplay}
                </Text>

                <Text
                  style={{
                    flex: 1,
                    fontFamily: "Inter_400Regular",
                    color: textColor,
                    marginRight: 5,
                    marginLeft: 5,
                    marginVertical: "auto",
                  }}
                >
                  {item.teamName}
                </Text>

                <Text
                  style={{
                    color: textColor,
                    fontFamily: "Inter_400Regular",
                    fontWeight: "bold",
                    marginRight: 5,
                    marginLeft: 5,
                    marginVertical: "auto",
                  }}
                >
                  {item.bestScore} pts
                </Text>

                {/* For robo categories, show the breakdown instead of time */}
                {judgeCategory && 
                 (judgeCategory.toLowerCase().includes('robo-elem') || 
                  judgeCategory.toLowerCase().includes('robo-junior') || 
                  judgeCategory.toLowerCase().includes('robo-senior')) ? (
                  <Text
                    style={{
                      color: textColor,
                      fontFamily: "Inter_400Regular",
                      marginLeft: 5,
                      marginVertical: "auto",
                      fontSize: 12,
                    }}
                  >
                    {item.day1BestScore}+{item.day2BestScore}
                  </Text>
                ) : (
                  item.bestTime && 
                  judgeCategory && 
                  !judgeCategory.toLowerCase().includes('future') && 
                  !judgeCategory.toLowerCase().includes('fi-') && (
                    <Text
                      style={{
                        color: textColor,
                        fontFamily: "Inter_400Regular",
                        marginLeft: 5,
                        marginVertical: "auto",
                      }}
                    >
                      {item.bestTime}
                    </Text>
                  )
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}