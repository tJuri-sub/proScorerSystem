import React from "react";
import { View, Text, FlatList } from "react-native";
import styles from "../../components/styles/judgeStyles/AllScoreScreen";

// Helper to parse "mm:ss:ms" to milliseconds
function parseTimeString(timeStr: string) {
  if (!timeStr) return Infinity;
  const [mm, ss, ms] = timeStr.split(":").map(Number);
  return (mm || 0) * 60000 + (ss || 0) * 1000 + (ms || 0);
}

// Helper to get best score and time
function getBestScoreAndTime(item: any) {
  const r1 = item.round1Score ?? null;
  const r2 = item.round2Score ?? null;
  const t1 = item.time1 ?? "";
  const t2 = item.time2 ?? "";
  if (r1 !== null && (r2 === null || r1 >= r2)) {
    return { bestScore: r1, bestTime: t1, bestTimeMs: parseTimeString(t1) };
  }
  if (r2 !== null && (r1 === null || r2 > r1)) {
    return { bestScore: r2, bestTime: t2, bestTimeMs: parseTimeString(t2) };
  }
  return { bestScore: null, bestTime: "", bestTimeMs: Infinity };
}

export default function AllRankingsScreen({ route }: any) {
  // Use the correct prop or navigation param for your teams/history array
  const { history } = route.params; // or use teams if that's your prop

  // Prepare rankings array with best score/time logic
  const rankings = history
    .map((item: any) => ({
      ...item,
      ...getBestScoreAndTime(item),
    }))
    .sort((a: any, b: any) => {
      if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
      return a.bestTimeMs - b.bestTimeMs;
    });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>All Rankings</Text>
      <Text style={styles.subtitle}>
        Showing {rankings.length} of {rankings.length} records
      </Text>
      <Text style={{ color: "#888", fontSize: 14, marginBottom: 8 }}>
        Ranking is based on the best score; if tied, the best time wins!
      </Text>
      <FlatList
        data={rankings}
        keyExtractor={(item) => item.id || item.teamId}
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.historyCard,
              { backgroundColor: index < 3 ? "#f7f7f7" : "#fff" },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontWeight: "bold", fontSize: 18, width: 32 }}>
                {index + 1}.
              </Text>
              <Text style={{ flex: 1, fontSize: 16 }}>{item.teamName}</Text>
              <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                {item.bestScore} pts
              </Text>
              <Text style={{ marginLeft: 12, fontSize: 15, color: "#1976d2" }}>
                {item.bestTime}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ margin: 10 }}>No rankings available.</Text>
        }
      />
    </View>
  );
}
