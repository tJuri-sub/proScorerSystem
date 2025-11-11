import React, { useEffect, useLayoutEffect, useState, useRef } from "react";
import {
  Text,
  View,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
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
import { AntDesign, Feather } from "@expo/vector-icons";
import DropDownPicker from "react-native-dropdown-picker";
import * as XLSX from "xlsx";

import { CategoryPills } from "../../components/component/categoryPillsAdmin";

const RECORDS_PER_PAGE = 10;
const windowHeight = Dimensions.get("window").height;

// Category-specific scoring logic (same as EventScores)
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


function parseTimeString(timeStr: string) {
  if (!timeStr) return Infinity;
  const [mm, ss, ms] = timeStr.split(":").map(Number);
  return (mm || 0) * 60000 + (ss || 0) * 1000 + (ms || 0);
}

export default function AdminOverallScores({ navigation }: any) {
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

  const scrollRef = useRef<FlatList<any>>(null);

  // Get category-specific configuration
  const categoryConfig = getCategoryFields(selectedCategory);

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
          onPress={() => exportOverallScores(selectedCategory)}
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
      const order = ["robo-elem", "robo-junior", "robo-senior", "robosports", "fi-elem", "fi-junior", "fi-senior", "future-eng"];
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

    // Listen to all teams (for team names, etc.)
    const teamsUnsub = onSnapshot(collection(db, "teams"), (teamsSnap) => {
      teamsMap = {};
      teamsSnap.forEach((doc) => {
        teamsMap[doc.id] = { id: doc.id, ...doc.data() };
      });
    });

    // Fetch scores based on event selection
    let scoresUnsub: (() => void) | undefined;

    if (selectedEvent === "all") {
      // For all events, aggregate scores from each event's subcollection
      (async () => {
        const eventsSnap = await getDocs(collection(db, "events"));
        let allScores: any[] = [];
        let unsubList: (() => void)[] = [];

        eventsSnap.forEach((eventDoc) => {
          const eventId = eventDoc.id;
          const scoresRef = collection(db, "events", eventId, "scores");
          const unsub = onSnapshot(scoresRef, (scoresSnap) => {
            scoresSnap.forEach((doc) => {
              const data = doc.data();
              if (data.category === selectedCategory) {
                allScores.push({ id: doc.id, ...data, eventId });
              }
            });

            // Build leaderboard
            const teamMap: Record<string, any> = {};
            allScores.forEach((score) => {
              const teamId = score.teamId;
              if (teamId && !teamsMap[teamId]?.disabled) {
                if (!teamMap[teamId]) {
                  teamMap[teamId] = {
                    teamName: score.teamName || teamsMap[teamId]?.teamName || "",
                    teamId: teamId,
                    ...score,
                  };
                }
              }
            });

            const leaderboardArr = Object.values(teamMap)
              .map((team: any) => categoryConfig.calculator(team))
              .filter((team: any) => team.bestScore !== undefined && team.bestScore > 0)
              .sort((a: any, b: any) => {
                if ((selectedCategory === 'robo-elem' || selectedCategory === 'robo-junior' || selectedCategory === 'robo-senior') && 
                    a.combinedTime !== undefined && b.combinedTime !== undefined) {
                  if (b.bestScore !== a.bestScore) {
                    return b.bestScore - a.bestScore;
                  }
                  // If scores are equal, sort by combined time (less is better)
                  return (a.combinedTime || Infinity) - (b.combinedTime || Infinity);
                }

                if (selectedCategory === 'future-eng') {
                  if (b.bestScore !== a.bestScore) {
                    return b.bestScore - a.bestScore;
                  }
                  return (a.totalTime || Infinity) - (b.totalTime || Infinity);
                }
                return b.bestScore - a.bestScore;
              });

            setLeaderboard(leaderboardArr);
            setCurrentPage(1);
            setScoresLoading(false);
          });
          unsubList.push(unsub);
        });

        scoresUnsub = () => {
          unsubList.forEach((unsub) => unsub());
        };
      })();
    } else {
      // Only fetch scores for the selected event
      const scoresRef = collection(db, "events", selectedEvent, "scores");
      scoresUnsub = onSnapshot(scoresRef, (scoresSnap) => {
        const scores: any[] = [];
        scoresSnap.forEach((doc) => {
          const data = doc.data();
          if (data.category === selectedCategory) {
            scores.push({ id: doc.id, ...data });
          }
        });

        const teamMap: Record<string, any> = {};
        scores.forEach((score) => {
          const teamId = score.teamId;
          if (teamId && !teamsMap[teamId]?.disabled) {
            if (!teamMap[teamId]) {
              teamMap[teamId] = {
                teamName: score.teamName || teamsMap[teamId]?.teamName || "",
                teamId: teamId,
                ...score,
              };
            }
          }
        });

        const leaderboardArr = Object.values(teamMap)
          .map((team: any) => categoryConfig.calculator(team))
          .filter((team: any) => team.bestScore !== undefined && team.bestScore > 0)
          .sort((a: any, b: any) => {
            if (selectedCategory === 'future-eng') {
              if (b.bestScore !== a.bestScore) {
                return b.bestScore - a.bestScore;
              }
              return (a.totalTime || Infinity) - (b.totalTime || Infinity);
            }
            return b.bestScore - a.bestScore;
          });

        setLeaderboard(leaderboardArr);
        setCurrentPage(1);
        setScoresLoading(false);
      });
    }

    return () => {
      teamsUnsub();
      if (scoresUnsub) scoresUnsub();
    };
  }, [selectedCategory, selectedEvent]);

  const exportOverallScores = (categoryLabel: string) => {
    if (leaderboard.length === 0) return;

    // Get event info for filename
    const eventInfo = selectedEvent === "all" ? "All_Events" : 
      events.find(e => e.id === selectedEvent)?.title?.replace(/\s+/g, "_") || selectedEvent;

    let data;
    
    if (selectedCategory === 'future-eng') {
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
    } else if (selectedCategory?.startsWith('fi-')) {
      data = leaderboard.map((team, index) => ({
        Rank: index + 1,
        Team: team.teamName,
        "Project & Innovation": team.projectInnovation ?? "-",
        "Robotic Solution": team.roboticSolution ?? "-",
        "Presentation & Team Spirit": team.presentationSpirit ?? "-",
        "Total Score": team.bestScore,
      }));
      } else if (selectedCategory === 'robo-elem' || selectedCategory === 'robo-junior' || selectedCategory === 'robo-senior') {
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

    // Create worksheet and workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Overall Scores");

    // Export
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const catLabel =
      categories.find((c) => c.id === selectedCategory)?.label ||
      selectedCategory;

    a.download = `overall_scores_${catLabel.replace(/\s+/g, "_")}_${eventInfo}.xlsx`;
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
    
    if (selectedCategory === 'future-eng') {
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
          <Text style={[stickyStyles.cell, { textAlign: "center", fontSize: 14, fontWeight: "bold" }]}>
            {item.bestScore}
            {item.totalTime ? `\n(${item.totalTime}s)` : ''}
          </Text>
        </View>
      );
    } else if (selectedCategory?.startsWith('fi-')) {
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
      } else if (selectedCategory === 'robo-elem' || selectedCategory === 'robo-junior' || selectedCategory === 'robo-senior') {
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
        </View>
      );
    }
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
      <View style={{ flex: 1, marginHorizontal: 10 }}>
        {renderTableHeader()}
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
            contentContainerStyle={{ padding: 1 }}
            renderItem={({ item, index }) => renderTableRow(item, index)}
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
    marginBottom: 0,
    fontFamily: "inter_400Regular",
    fontSize: 16,
  },
});