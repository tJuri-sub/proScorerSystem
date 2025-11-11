import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  Text,
  View,
  FlatList,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
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
import { AntDesign, Feather } from "@expo/vector-icons";
import * as XLSX from "xlsx";
import { useRoute } from "@react-navigation/native";

const RECORDS_PER_PAGE = 10;

function parseTimeString(timeStr: string) {
  if (!timeStr) return Infinity;
  const [mm, ss, ms] = timeStr.split(":").map(Number);
  return (mm || 0) * 60000 + (ss || 0) * 1000 + (ms || 0);
}

export default function EventLeaderboard({ navigation }: any) {
  const route = useRoute();
  const params = route.params as { eventId?: string; category?: string; date?: string } || {};
  const { eventId, category, date } = params;

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [eventTitle, setEventTitle] = useState("");

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `${category} - Event Leaderboard`,
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
          onPress={() => exportLeaderboard()}
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
        // Optionally filter by category if needed
        if (data.category === category) {
          const teamId = data.teamId;
          if (teamId) {
            if (!teamMap[teamId]) {
              teamMap[teamId] = {
                teamName: data.teamName || "",
                teamId: teamId,
                round1Score: data.round1Score,
                round2Score: data.round2Score,
                time1: data.time1,
                time2: data.time2,
              };
            }
          }
        }
      });

      // Calculate best scores and times
      Object.values(teamMap).forEach((team: any) => {
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
      });

      const leaderboardArr = Object.values(teamMap)
        .filter((team: any) => team.bestScore !== undefined)
        .sort((a: any, b: any) => {
          const aScore = a.bestScore ?? -Infinity;
          const bScore = b.bestScore ?? -Infinity;
          if (bScore !== aScore) return bScore - aScore;
          return (a.bestTimeMs ?? Infinity) - (b.bestTimeMs ?? Infinity);
        })
        .map((team, idx) => ({
          ...team,
          overallRank: idx + 1,
        }));

      setLeaderboard(leaderboardArr);
      setCurrentPage(1);
      setScoresLoading(false);
    });

    return () => unsubscribe();
  }, [eventId, category]);

  const exportLeaderboard = () => {
    if (leaderboard.length === 0) return;

    const data = leaderboard.map((team) => ({
      Rank: team.overallRank,
      Team: team.teamName,
      "Best Score": team.bestScore,
      "Best Time": team.bestTime,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Event Leaderboard");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event_leaderboard_${category}_${date || 'unknown'}.xlsx`;
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

      {/* Search and Controls */}
      <View style={stickyStyles.tabsContainer}>
        <TextInput
          placeholder="Search teams..."
          placeholderTextColor="#999999"
          value={search}
          onChangeText={setSearch}
          style={stickyStyles.searchInput}
        />
      </View>

      {/* Leaderboard List */}
      <View style={{ flex: 1 }}>
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
            renderItem={({ item, index }) => {
              const overallRank = item.overallRank - 1;
              const rankColors = ["#F8AA0C", "#3A9F6C", "#0081CC"];
              const isTopThree = overallRank < 3;
              const cardBg = isTopThree ? rankColors[overallRank] : "#fff";
              const textColor = isTopThree ? "#fff" : "#000";
              const rankIcons = ["🥇", "🥈", "🥉"];
              const rankDisplay = isTopThree
                ? rankIcons[overallRank]
                : `${item.overallRank}.`;
              
              return (
                <View style={[styles.containerCard, { backgroundColor: cardBg }]}>
                  <Text
                    style={{
                      width: 25,
                      textAlign: "center",
                      fontFamily: "Inter_400Regular",
                      fontWeight: isTopThree ? "700" : "500",
                      fontSize: isTopThree ? 22 : 12,
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
                </View>
              );
            }}
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
    zIndex: 10,
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