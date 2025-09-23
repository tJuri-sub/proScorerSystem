import React, { useEffect, useState } from "react";
import { Text, View, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native";
import { getFirestore, collection, getDocs, doc, getDoc, onSnapshot } from "firebase/firestore";
import { FIREBASE_AUTH, FIREBASE_DB } from "../firebaseconfig";

function parseTimeString(timeStr: string) {
  if (!timeStr) return Infinity;
  const [mm, ss, ms] = timeStr.split(":").map(Number);
  return (mm || 0) * 60000 + (ss || 0) * 1000 + (ms || 0);
}

export default function AllLeaderboardScreen({ route }: any) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [judgeCategory, setJudgeCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [eventTitle, setEventTitle] = useState<string>("");
  const recordsPerPage = 10;
  const db = getFirestore();

  // Get eventId and eventTitle from route params
  const { eventId, eventTitle: routeEventTitle } = route?.params || {};

  useEffect(() => {
    const fetchJudgeCategory = async () => {
      const user = FIREBASE_AUTH.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(FIREBASE_DB, "judge-users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setJudgeCategory(data.category || null);
        }
      }
    };
    fetchJudgeCategory();
    
    if (routeEventTitle) {
      setEventTitle(routeEventTitle);
    }
  }, [routeEventTitle]);

  useEffect(() => {
    if (!judgeCategory || !eventId) {
      setLoading(false);
      return;
    }

    // Use the same fetching logic as Leaderboard.tsx
    const scoresRef = collection(db, "events", eventId, "scores");
    const unsubscribeScores = onSnapshot(scoresRef, (scoresSnap) => {
      const teamMap: Record<string, any> = {};

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

      // Calculate best scores and times for ranking - same logic as Leaderboard.tsx
      Object.values(teamMap).forEach((team) => {
        const categoryLower = judgeCategory.toLowerCase();
        
        if (categoryLower.includes('robo-elem') || categoryLower.includes('robo-junior') || categoryLower.includes('robo-senior')) {
          // Handle day 1 and day 2 scoring
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
          team.bestTime = `${day1BestScore}+${day2BestScore}`;
          
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
          const obstacle1 = team.obstacleScore1 ?? 0;
          const obstacle2 = team.obstacleScore2 ?? 0;
          const docScore = team.docScore ?? 0;
          
          const highestOpen = Math.max(open1, open2);
          const highestObstacle = Math.max(obstacle1, obstacle2);
          
          team.bestScore = highestOpen + highestObstacle + docScore;
          
          // For tie-breaking, use the time from the round that gave the highest total
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

      // Create leaderboard array with all teams (not limited to top 8)
      const leaderboardArr = Object.values(teamMap)
        .filter((team) => team.bestScore !== undefined && team.bestScore !== null)
        .sort((a, b) => {
          const aScore = a.bestScore ?? -Infinity;
          const bScore = b.bestScore ?? -Infinity;
          if (bScore !== aScore) return bScore - aScore;
          return (a.bestTimeMs ?? Infinity) - (b.bestTimeMs ?? Infinity);
        });

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
  }, [judgeCategory, eventId]);

  // Pagination logic
  const totalRecords = leaderboard.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = leaderboard.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 5 }}>All Rankings</Text>
      {eventTitle && (
        <Text style={{ fontSize: 16, color: "#666", marginBottom: 5 }}>
          Event: {eventTitle}
        </Text>
      )}
      {judgeCategory && (
        <Text style={{ fontSize: 14, color: "#666", marginBottom: 10 }}>
          Category: {judgeCategory}
        </Text>
      )}
      <Text style={{ marginBottom: 10 }}>
        Showing {currentRecords.length} of {totalRecords} records
      </Text>
      {/* <Text style={{ color: "#888", fontSize: 14, marginBottom: 8 }}>
        Ranking is based on the total score; if tied, the best time wins!
      </Text> */}
      <FlatList
        data={currentRecords}
        keyExtractor={(item) => item.teamId}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={({ item, index }) => {
          const overallRank = startIndex + index;
          const rankColors = ["#F8AA0C", "#3A9F6C", "#0081CC"];
          const isTopThree = overallRank < 3;
          const cardBg = isTopThree ? rankColors[overallRank] : "#fff";
          const textColor = isTopThree ? "#fff" : "#000";
          const rankIcons = ["🥇", "🥈", "🥉"];
          const rankDisplay = isTopThree
            ? rankIcons[overallRank]
            : `${overallRank + 1}.`;

          return (
            <View style={[styles.containerCard, { backgroundColor: cardBg }]}>
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

              {/* Display time/breakdown based on category */}
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
        ListEmptyComponent={<Text>No scores yet for this event!</Text>}
      />
      <View style={styles.pagination}>
        <TouchableOpacity
          onPress={handlePreviousPage}
          disabled={currentPage === 1}
          style={[styles.pageButton, currentPage === 1 && styles.disabledButton]}
        >
          <Text style={styles.pageButtonText}>Previous</Text>
        </TouchableOpacity>
        <Text style={styles.pageInfo}>
          Page {currentPage} of {totalPages}
        </Text>
        <TouchableOpacity
          onPress={handleNextPage}
          disabled={currentPage === totalPages}
          style={[styles.pageButton, currentPage === totalPages && styles.disabledButton]}
        >
          <Text style={styles.pageButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  containerCard: {
    padding: 12,
    borderColor: "#919191",
    borderRadius: 10,
    flexDirection: "row",
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    marginHorizontal: 5,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  pageButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 5,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  pageButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  pageInfo: {
    fontSize: 16,
  },
});