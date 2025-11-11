import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
} from "react-native";
import {
  getFirestore,
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import styles from "../../components/styles/judgeStyles/LeaderboardStyling";
import { AntDesign } from "@expo/vector-icons";
import * as XLSX from "xlsx";
import { useRoute } from "@react-navigation/native";

const RECORDS_PER_PAGE = 10;

// Category-specific scoring logic
const getCategoryFields = (category: string) => {
  switch (category) {
    case 'future-eng':
      return {
        fields: ['openScore1', 'openScore2', 'obstacleScore1', 'obstacleScore2', 'docScore', 'openTime1', 'openTime2', 'obstacleTime1', 'obstacleTime2'],
        headers: ['Open R1', 'Open R2', 'Obstacle R1', 'Obstacle R2', 'Docs', 'Total'],
        calculator: (data: any) => {
          const openBest = Math.max(data.openScore1 || 0, data.openScore2 || 0);
          const obstacleBest = Math.max(data.obstacleScore1 || 0, data.obstacleScore2 || 0);
          const docs = data.docScore || 0;
          
          // Calculate total time (sum of best round times)
          const openBestTime = (data.openScore1 || 0) >= (data.openScore2 || 0) ? 
            parseTimeToSeconds(data.openTime1) : parseTimeToSeconds(data.openTime2);
          const obstacleBestTime = (data.obstacleScore1 || 0) >= (data.obstacleScore2 || 0) ? 
            parseTimeToSeconds(data.obstacleTime1) : parseTimeToSeconds(data.obstacleTime2);
          
          let totalTime = openBestTime + obstacleBestTime;
          if (totalTime > 180) totalTime = 180; // Cap at 180 seconds
          
          return {
            ...data,
            bestScore: openBest + obstacleBest + docs,
            totalTime,
            breakdown: {
              openBest,
              obstacleBest,
              docs,
              totalScore: openBest + obstacleBest + docs
            }
          };
        }
      };
      
    case 'fi-elem':
      return {
        fields: ['projectInnovation', 'roboticSolution', 'presentationSpirit'],
        headers: ['Project (70)', 'Robotic (65)', 'Presentation (65)', 'Total'],
        calculator: (data: any) => ({
          ...data,
          bestScore: (data.projectInnovation || 0) + (data.roboticSolution || 0) + (data.presentationSpirit || 0),
          breakdown: {
            projectInnovation: data.projectInnovation || 0,
            roboticSolution: data.roboticSolution || 0,
            presentationSpirit: data.presentationSpirit || 0,
            totalScore: (data.projectInnovation || 0) + (data.roboticSolution || 0) + (data.presentationSpirit || 0)
          }
        })
      };
      
    case 'fi-junior':
    case 'fi-senior':
      return {
        fields: ['projectInnovation', 'roboticSolution', 'presentationSpirit'],
        headers: ['Project (75)', 'Robotic (70)', 'Presentation (55)', 'Total'],
        calculator: (data: any) => ({
          ...data,
          bestScore: (data.projectInnovation || 0) + (data.roboticSolution || 0) + (data.presentationSpirit || 0),
          breakdown: {
            projectInnovation: data.projectInnovation || 0,
            roboticSolution: data.roboticSolution || 0,
            presentationSpirit: data.presentationSpirit || 0,
            totalScore: (data.projectInnovation || 0) + (data.roboticSolution || 0) + (data.presentationSpirit || 0)
          }
        })
      };
      
    case 'robosports':
      // Placeholder for future implementation
      return {
        fields: ['round1Score', 'round2Score'],
        headers: ['Round 1', 'Round 2'],
        calculator: (data: any) => ({
          ...data,
          bestScore: Math.max(data.round1Score || 0, data.round2Score || 0)
        })
      };

    case 'robo-elem':
    case 'robo-junior':  
    case 'robo-senior':
      return {
        fields: ['day1Round1Score', 'day1Round2Score', 'day1Round3Score', 'day2Round1Score', 'day2Round2Score', 'day2Round3Score'],
        headers: ['D1R1', 'D1R2', 'D1R3', 'D2R1', 'D2R2', 'D2R3', 'D1 Best', 'D2 Best', 'Total'],
        calculator: (data: any) => {
          // Day 1 scores
          const day1Scores = [
            { score: data.day1Round1Score, time: data.day1Round1Time },
            { score: data.day1Round2Score, time: data.day1Round2Time },
            { score: data.day1Round3Score, time: data.day1Round3Time }
          ].filter(r => r.score != null);

          // Day 2 scores
          const day2Scores = [
            { score: data.day2Round1Score, time: data.day2Round1Time },
            { score: data.day2Round2Score, time: data.day2Round2Time },
            { score: data.day2Round3Score, time: data.day2Round3Time }
          ].filter(r => r.score != null);

          // Find best run from day 1 (highest score, then lowest time)
          let day1Best = null;
          if (day1Scores.length > 0) {
            day1Best = day1Scores.reduce((best, current) => {
              if (current.score > best.score) return current;
              if (current.score === best.score && parseTimeToSeconds(current.time) < parseTimeToSeconds(best.time)) return current;
              return best;
            });
          }

          // Find best run from day 2 (highest score, then lowest time)
          let day2Best = null;
          if (day2Scores.length > 0) {
            day2Best = day2Scores.reduce((best, current) => {
              if (current.score > best.score) return current;
              if (current.score === best.score && parseTimeToSeconds(current.time) < parseTimeToSeconds(best.time)) return current;
              return best;
            });
          }

          // Calculate total score (sum of best from each day)
          const day1BestScore = day1Best ? day1Best.score : 0;
          const day2BestScore = day2Best ? day2Best.score : 0;
          const totalScore = day1BestScore + day2BestScore;
          
          // For tie-breaking, use combined time (sum of best times from both days)
          const day1BestTime = day1Best ? parseTimeToSeconds(day1Best.time) : 0;
          const day2BestTime = day2Best ? parseTimeToSeconds(day2Best.time) : 0;
          const combinedTime = day1BestTime + day2BestTime;
          
          return {
            ...data,
            bestScore: totalScore,
            combinedTime,
            breakdown: {
              day1BestScore,
              day2BestScore,
              day1BestTime: day1Best ? day1Best.time : "",
              day2BestTime: day2Best ? day2Best.time : "",
              totalScore
            }
          };
        }
      };
      
    default: // fallback to legacy data
      return {
        fields: ['round1Score', 'round2Score'],
        headers: ['Round 1', 'Round 2'],
        calculator: (data: any) => ({
          ...data,
          bestScore: Math.max(data.round1Score || 0, data.round2Score || 0)
        })
      };
  }
};

const parseTimeToSeconds = (timeStr: string): number => {
  if (!timeStr) return 0;
  
  // Handle mm:ss.ms format (new format)
  if (timeStr.includes('.')) {
    const [timepart, ms] = timeStr.split('.');
    const [mm, ss] = timepart.split(':').map(Number);
    return (mm || 0) * 60 + (ss || 0) + (parseInt(ms) || 0) / 100;
  }
  
  // Handle mm:ss:ms format (legacy format)  
  const parts = timeStr.split(':');
  if (parts.length === 3) {
    const [mm, ss, ms] = parts.map(Number);
    return (mm || 0) * 60 + (ss || 0) + (ms || 0) / 100;
  }
  
  return 0;
};

export default function EventScores({ navigation }: any) {
  const route = useRoute();
  const params = route.params as { eventId?: string; category?: string; date?: string } || {};
  const { eventId, category, date } = params;

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [eventTitle, setEventTitle] = useState("");

  // Get category-specific configuration
  const categoryConfig = getCategoryFields(category || '');

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `${category} - Event Scores`,
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 15 }}
        >
          <AntDesign name="arrowleft" size={24} color="black" />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={() => exportOverallScores()}
          style={{ marginRight: 15 }}
        >
          <AntDesign name="export" size={24} color="black" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, category]);

  useEffect(() => {
    if (!eventId || !category) {
      setScoresLoading(false);
      return;
    }

    // Fetch event title
    const fetchEventTitle = async () => {
      try {
        const db = getFirestore();
        const eventDoc = await getDocs(query(
          collection(db, "events"),
          where("__name__", "==", eventId)
        ));
        if (!eventDoc.empty) {
          const eventData = eventDoc.docs[0].data();
          setEventTitle(eventData.title || "Event");
        }
      } catch (error) {
        console.error("Error fetching event:", error);
      }
    };

    fetchEventTitle();
    setScoresLoading(true);

    const db = getFirestore();
    
    // Query scores for specific event and category
    const scoresRef = collection(db, "events", eventId, "scores");
    const unsubscribe = onSnapshot(scoresRef, (scoresSnap) => {
      const teamMap: Record<string, any> = {};

      scoresSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.category === category) {
          const teamId = data.teamId;
          if (teamId) {
            if (!teamMap[teamId]) {
              teamMap[teamId] = {
                teamName: data.teamName || "",
                teamId: teamId,
                ...data, // Include all fields from the document
              };
            }
          }
        }
      });

      // Apply category-specific calculations
      const leaderboardArr = Object.values(teamMap)
        .map((team: any) => categoryConfig.calculator(team))
        .filter((team: any) => team.bestScore !== undefined && team.bestScore > 0)
        .sort((a: any, b: any) => {
          if ((category === 'robo-elem' || category === 'robo-junior' || category === 'robo-senior') && 
              a.combinedTime !== undefined && b.combinedTime !== undefined) {
            if (b.bestScore !== a.bestScore) {
              return b.bestScore - a.bestScore;
            }
            // If scores are equal, sort by combined time (less is better)
            return (a.combinedTime || Infinity) - (b.combinedTime || Infinity);
          }
          // For future-eng, also consider time in sorting
          if (category === 'future-eng') {
            if (b.bestScore !== a.bestScore) {
              return b.bestScore - a.bestScore;
            }
            // If scores are equal, sort by time (less is better)
            return (a.totalTime || Infinity) - (b.totalTime || Infinity);
          }
          return b.bestScore - a.bestScore;
        });

      setLeaderboard(leaderboardArr);
      setCurrentPage(1);
      setScoresLoading(false);
    });

    return () => unsubscribe();
  }, [eventId, category]);

  const exportOverallScores = () => {
    if (leaderboard.length === 0) return;

    let data;
    
    if (category === 'future-eng') {
      data = leaderboard.map((team, index) => ({
        Rank: index + 1,
        Team: team.teamName,
        "Open Round 1": team.openScore1 ?? "-",
        "Open Round 2": team.openScore2 ?? "-",
        "Obstacle Round 1": team.obstacleScore1 ?? "-",
        "Obstacle Round 2": team.obstacleScore2 ?? "-",
        "Documentation": team.docScore ?? "-",
        "Total Score": team.bestScore,
        "Total Time": team.totalTime ? `${team.totalTime}s` : "-",
      }));
    } else if (category?.startsWith('fi-')) {
      data = leaderboard.map((team, index) => ({
        Rank: index + 1,
        Team: team.teamName,
        "Project & Innovation": team.projectInnovation ?? "-",
        "Robotic Solution": team.roboticSolution ?? "-",
        "Presentation & Team Spirit": team.presentationSpirit ?? "-",
        "Total Score": team.bestScore,
      }));
    } else if (category === 'robo-elem' || category === 'robo-junior' || category === 'robo-senior') {
        data = leaderboard.map((team, index) => ({
        Rank: index + 1,
        Team: team.teamName,
        "Day 1 Round 1": team.day1Round1Score ?? "-",
        "Day 1 Round 2": team.day1Round2Score ?? "-",
        "Day 1 Round 3": team.day1Round3Score ?? "-",
        "Day 1 Best": team.breakdown?.day1BestScore ?? "-",
        "Day 1 Best Time": team.breakdown?.day1BestTime ?? "-",
        "Day 2 Round 1": team.day2Round1Score ?? "-",
        "Day 2 Round 2": team.day2Round2Score ?? "-",
        "Day 2 Round 3": team.day2Round3Score ?? "-",
        "Day 2 Best": team.breakdown?.day2BestScore ?? "-",
        "Day 2 Best Time": team.breakdown?.day2BestTime ?? "-",
        "Total Score": team.bestScore,
        "Combined Time": team.combinedTime ? `${team.combinedTime}s` : "-",
      }));
    } else {
      // Default robomissions format
      data = leaderboard.map((team, index) => ({
        Rank: index + 1,
        Team: team.teamName,
        "Round 1 Score": team.round1Score ?? "-",
        "Round 2 Score": team.round2Score ?? "-",
        "Best Score": team.bestScore,
      }));
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Event Scores");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event_scores_${category}_${date || 'unknown'}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter leaderboard by search
  const filteredLeaderboard = leaderboard.filter(
    (team) =>
      team.teamName &&
      team.teamName.toLowerCase().includes(search.trim().toLowerCase())
  );

  const totalRecords = filteredLeaderboard.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / RECORDS_PER_PAGE));
  const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
  const endIndex = startIndex + RECORDS_PER_PAGE;
  const currentRecords = filteredLeaderboard.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Render different table headers based on category
  const renderTableHeader = () => {
    return (
      <View style={stickyStyles.header}>
        <Text style={stickyStyles.heading}>Team Name</Text>
        {categoryConfig.headers.map((header, index) => (
          <Text key={index} style={[stickyStyles.heading, stickyStyles.align]}>
            {header}
          </Text>
        ))}
      </View>
    );
  };

  // Render different table rows based on category
  const renderTableRow = (item: any, index: number) => {
    const overallRank = startIndex + index;
    const rankDisplay = `${overallRank + 1}.`;
    
    if (category === 'future-eng') {
      return (
        <View style={stickyStyles.row}>
          <Text style={stickyStyles.cell}>
            {rankDisplay} {item.teamName}
          </Text>
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 12 }]}>
            {item.openScore1 ?? "N/A"}
          </Text>
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 12 }]}>
            {item.openScore2 ?? "N/A"}
          </Text>
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 12 }]}>
            {item.obstacleScore1 ?? "N/A"}
          </Text>
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 12 }]}>
            {item.obstacleScore2 ?? "N/A"}
          </Text>
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 12 }]}>
            {item.docScore ?? "N/A"}
          </Text>
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 16, fontWeight: "bold" }]}>
            {item.bestScore}
            {item.totalTime ? `\n(${item.totalTime}s)` : ''}
          </Text>
        </View>
      );
    } else if (category?.startsWith('fi-')) {
      return (
        <View style={stickyStyles.row}>
          <Text style={stickyStyles.cell}>
            {rankDisplay} {item.teamName}
          </Text>
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 14 }]}>
            {item.projectInnovation ?? "N/A"}
          </Text>
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 14 }]}>
            {item.roboticSolution ?? "N/A"}
          </Text>
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 14 }]}>
            {item.presentationSpirit ?? "N/A"}
          </Text>
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 16, fontWeight: "bold" }]}>
            {item.bestScore}
          </Text>
        </View>
      );
      } else if (category === 'robo-elem' || category === 'robo-junior' || category === 'robo-senior') {
      return (
        <View style={stickyStyles.row}>
          <Text style={stickyStyles.cell}>
            {rankDisplay} {item.teamName}
          </Text>
          {/* Day 1 Rounds */}
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 10 }]}>
            {item.day1Round1Score ?? "N/A"}
          </Text>
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 10 }]}>
            {item.day1Round2Score ?? "N/A"}
          </Text>
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 10 }]}>
            {item.day1Round3Score ?? "N/A"}
          </Text>
          {/* Day 2 Rounds */}
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 10 }]}>
            {item.day2Round1Score ?? "N/A"}
          </Text>
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 10 }]}>
            {item.day2Round2Score ?? "N/A"}
          </Text>
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 10 }]}>
            {item.day2Round3Score ?? "N/A"}
          </Text>
          {/* Day 1 Best */}
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 12, fontWeight: "bold", color: "#2d5a3d" }]}>
            {item.breakdown?.day1BestScore ?? "N/A"}
          </Text>
          {/* Day 2 Best */}
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 12, fontWeight: "bold", color: "#2d5a3d" }]}>
            {item.breakdown?.day2BestScore ?? "N/A"}
          </Text>
          {/* Total */}
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 16, fontWeight: "bold", color: "#1976d2" }]}>
            {item.bestScore}
          </Text>
        </View>
      );
    } else {
      // Default robomissions format
      return (
        <View style={stickyStyles.row}>
          <Text style={stickyStyles.cell}>
            {rankDisplay} {item.teamName}
          </Text>
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 18 }]}>
            {item.round1Score ?? "N/A"}
          </Text>
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 18 }]}>
            {item.round2Score ?? "N/A"}
          </Text>
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 16, fontWeight: "bold" }]}>
            {item.bestScore}
          </Text>
        </View>
      );
    }
  };

  if (!eventId || !category) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 18, color: 'red' }}>
          Error: Event ID or Category is missing.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Header Info */}
      <View style={stickyStyles.headerContainer}>
        <Text style={stickyStyles.eventTitle}>{eventTitle}</Text>
        <Text style={stickyStyles.eventInfo}>
          {category} • {date}
        </Text>
      </View>

      {/* Search */}
      <View style={stickyStyles.tabsContainer}>
        <TextInput
          placeholder="Search teams..."
          placeholderTextColor="#999999"
          value={search}
          onChangeText={setSearch}
          style={stickyStyles.searchInput}
        />
      </View>

      {/* Scores List */}
      <View style={{ flex: 1, marginHorizontal: 10 }}>
        {renderTableHeader()}

        {scoresLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" />
          </View>
        ) : currentRecords.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ textAlign: "center" }}>No scores yet for this event!</Text>
          </View>
        ) : (
          <FlatList
            data={currentRecords}
            keyExtractor={(item) => item.teamId}
            renderItem={({ item, index }) => renderTableRow(item, index)}
          />
        )}
      </View>

      {/* Pagination Controls */}
      <View style={stickyStyles.paginationContainer}>
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity
            onPress={handlePreviousPage}
            disabled={currentPage === 1}
            style={{
              padding: 8,
              marginHorizontal: 8,
              backgroundColor: currentPage === 1 ? "#eee" : "#999999",
              borderRadius: 6,
            }}
          >
            <AntDesign 
              name="left" 
              size={16} 
              color={currentPage === 1 ? "#aaa" : "white"} 
            />
          </TouchableOpacity>
          <Text style={{ alignSelf: "center", fontSize: 16 }}>
            Page {currentPage} of {totalPages}
          </Text>
          <TouchableOpacity
            onPress={handleNextPage}
            disabled={currentPage === totalPages}
            style={{
              padding: 8,
              marginHorizontal: 8,
              backgroundColor: currentPage === totalPages ? "#eee" : "#999999",
              borderRadius: 6,
            }}
          >
            <AntDesign 
              name="right" 
              size={16} 
              color={currentPage === totalPages ? "#aaa" : "white"} 
            />
          </TouchableOpacity>
        </View>
        <Text style={{ color: "#555", marginLeft: 16 }}>
          Showing {currentRecords.length} of {leaderboard.length} teams
        </Text>
      </View>
    </View>
  );
}

const stickyStyles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#432344",
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  eventInfo: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
  },
  tabsContainer: {
    backgroundColor: "#fafafa",
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 16,
    zIndex: 10,
    elevation: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  paginationContainer: {
    backgroundColor: "#fafafa",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: "#eee",
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#432344",
    borderBottomWidth: 1,
    borderColor: "#eee",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  heading: {
    flex: 1,
    fontSize: 12,
    color: "#fff",
    fontWeight: "bold",
  },
  align: {
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 1,
    marginHorizontal: 2,
    elevation: 1,
    backgroundColor: "#fff",
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  cell: {
    flex: 1,
    textAlign: "left",
    fontSize: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    borderColor: "#e0e0e0",
    backgroundColor: "#fafafa",
    fontFamily: "inter_400Regular",
    fontSize: 16,
    width: "100%",
  },
});