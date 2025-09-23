import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  Text,
  View,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Share,
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
import { CategoryPills } from "../../components/component/categoryPillsAdmin";
import DropDownPicker from "react-native-dropdown-picker";
import * as XLSX from "xlsx";

const RECORDS_PER_PAGE = 10;
const windowHeight = Dimensions.get("window").height;

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
  const [allLeaderboard, setAllLeaderboard] = useState<any[]>([]);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");

  // Event filter states
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
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
      headerRight: () => (
        <TouchableOpacity
          onPress={() => exportLeaderboard(selectedCategory)}
          style={{
            marginRight: 15,
          }}
        >
          <AntDesign name="export" size={24} color="black" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, selectedCategory]);

  useEffect(() => {
    const fetchCategories = async () => {
      const db = getFirestore();
      const categoriesSnap = await getDocs(collection(db, "categories"));
      let cats = categoriesSnap.docs.map((doc) => ({
        id: doc.id,
        label: doc.data().label || doc.id,
      }));

      // Custom sort order
      const order = ["robo-elem", "robo-junior", "robo-senior", "robosports"];
      cats = [
        ...(order
          .map((catId) => cats.find((cat) => cat.id === catId))
          .filter(Boolean) as { id: string; label: any }[]),
        ...cats.filter((cat) => !order.includes(cat.id)),
      ];

      setCategories(cats);
      if (cats.length > 0) setSelectedCategory(cats[0].id);
    };
    fetchCategories();
  }, []);

  // Fetch events for filtering
  useEffect(() => {
    const fetchEvents = async () => {
      const db = getFirestore();
      const eventsSnap = await getDocs(collection(db, "events"));
      const eventsList = eventsSnap.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title || "Untitled Event",
        date: doc.data().date || "",
      }));
      // Sort events by date (newest first)
      eventsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEvents([{ id: "all", title: "All Events", date: "" }, ...eventsList]);
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    setScoresLoading(true);

    const db = getFirestore();
    let teamsMap: Record<string, any> = {};

    const teamsUnsub = onSnapshot(collection(db, "teams"), (teamsSnap) => {
      teamsMap = {};
      teamsSnap.forEach((doc) => {
        teamsMap[doc.id] = { id: doc.id, ...doc.data() };
      });
    });

    // Create query based on event selection
    let scoresQuery;
    if (selectedEvent === "all") {
      scoresQuery = query(
        collection(db, "scores"),
        where("category", "==", selectedCategory)
      );
    } else {
      scoresQuery = query(
        collection(db, "scores"),
        where("category", "==", selectedCategory),
        where("eventId", "==", selectedEvent)
      );
    }

    const scoresUnsub = onSnapshot(scoresQuery, (scoresSnap) => {
      const scores = scoresSnap.docs
        .map((doc) => {
          const data = doc.data() as {
            round1Score?: number;
            round2Score?: number;
            time1?: string;
            time2?: string;
            category?: string;
            teamId?: string;
            teamName?: string;
            eventId?: string;
            [key: string]: any;
          };
          return { id: doc.id, ...data };
        });

      const teamMap: Record<string, any> = {};
      scores.forEach((score) => {
        const teamId = score.teamId;
        if (teamId && !teamsMap[teamId]?.disabled) {
          if (!teamMap[teamId]) {
            teamMap[teamId] = {
              teamName: score.teamName || teamsMap[teamId]?.teamName || "",
              teamId: teamId,
              round1Score: score.round1Score,
              round2Score: score.round2Score,
              time1: score.time1,
              time2: score.time2,
            };
          }
        }
      });

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
          overallRank: idx + 1, // assign true rank
        }));

      setLeaderboard(leaderboardArr);
      setCurrentPage(1);
      setScoresLoading(false);
    });

    return () => {
      teamsUnsub();
      scoresUnsub();
    };
  }, [selectedCategory, selectedEvent]);

  const exportLeaderboard = (categoryLabel: string) => {
    if (leaderboard.length === 0) return;

    // Get event info for filename
    const eventInfo = selectedEvent === "all" ? "All_Events" : 
      events.find(e => e.id === selectedEvent)?.title?.replace(/\s+/g, "_") || selectedEvent;

    // 1. Prepare data
    const data = leaderboard.map((team) => ({
      Rank: team.overallRank,
      Team: team.teamName,
      "Best Score": team.bestScore,
      "Best Time": team.bestTime,
    }));

    // 2. Create worksheet and workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leaderboard");

    // 3. Write workbook to binary string
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    // 4. Create Blob and download link
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    // Use category and event info in file name
    const safeCategory = categoryLabel.replace(/\s+/g, "_");
    a.download = `leaderboard_${safeCategory}_${eventInfo}.xlsx`;
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

  return (
    <View style={{ flex: 1 }}>
      {/* Sticky Tabs */}
      <View style={stickyStyles.tabsContainer}>
        <View style={{ marginBottom: 8 }}>
          <TextInput
            placeholder="Search teams..."
            placeholderTextColor="#999999"
            value={search}
            onChangeText={setSearch}
            style={[stickyStyles.searchInput, { maxWidth: 340, width: "100%" }]}
          />
        </View>
        
        {/* Event Filter Dropdown */}
        <View style={{ marginBottom: 8, zIndex: 1000 }}>
          <DropDownPicker
            open={eventDropdownOpen}
            setOpen={setEventDropdownOpen}
            value={selectedEvent}
            setValue={setSelectedEvent}
            items={events.map(event => ({
              label: event.id === "all" ? "All Events" : `${event.title}${event.date ? ` (${event.date})` : ''}`,
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
            listItemLabelStyle={{
              fontSize: 14,
            }}
          />
        </View>

        <CategoryPills
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
      </View>
      
      {/* Leaderboard List */}
      <View style={{ flex: 1 }}>
        {scoresLoading ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" />
          </View>
        ) : currentRecords.length === 0 ? (
          <View
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ textAlign: "center" }}>
              {selectedEvent === "all" ? "No scores yet!" : "No scores for this event yet!"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={currentRecords}
            keyExtractor={(item) => item.teamId}
            renderItem={({ item, index }) => {
              const overallRank = item.overallRank - 1; // zero-based index
              const rankColors = ["#F8AA0C", "#3A9F6C", "#0081CC"];
              const isTopThree = overallRank < 3;
              const cardBg = isTopThree ? rankColors[overallRank] : "#fff";
              const textColor = isTopThree ? "#fff" : "#000";
              const rankIcons = ["🥇", "🥈", "🥉"];
              const rankDisplay = isTopThree
                ? rankIcons[overallRank]
                : `${item.overallRank}.`;
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
                      fontSize: isTopThree ? 22 : 12, // Enlarged medal icon
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
      
      {/* Sticky Pagination Controls */}
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
            <Text style={{ color: currentPage === 1 ? "#aaa" : "#fff" }}>
              <AntDesign name="left" size={16} color="black" />
            </Text>
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
            <Text
              style={{
                color: currentPage === totalPages ? "#aaa" : "#fff",
              }}
            >
              <AntDesign name="right" size={16} color="black" />
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: "#555", marginLeft: 16 }}>
          Showing {currentRecords.length} of {leaderboard.length} teams
          {selectedEvent !== "all" && ` (${events.find(e => e.id === selectedEvent)?.title || 'Selected Event'})`}
        </Text>
      </View>
    </View>
  );
}

const stickyStyles = StyleSheet.create({
  tabsContainer: {
    backgroundColor: "#fafafa",
    paddingTop: 16,
    paddingBottom: 0,
    zIndex: 10,
    elevation: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
    paddingLeft: 16,
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
    marginBottom: 0,
    fontFamily: "inter_400Regular",
    fontSize: 16,
  },
});