import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import styles from "../../components/styles/judgeStyles/CategoryStyling";
import ScoreCard from "../../components/component/ScoreCard"; // Adjust path if needed

export default function TeamScoresScreen({ route, navigation }: any) {
  const { team, category, selectedEvents = [] } = route.params; // category is already available
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);

  const db = getFirestore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch events for display names
        const eventsSnapshot = await getDocs(collection(db, "events"));
        const eventsList = eventsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEvents(eventsList);

        // Fetch scores from each event
        let allScores: any[] = [];

        const eventsToQuery =
          selectedEvents.length > 0
            ? selectedEvents
            : eventsList.map((e: any) => e.id);

        for (const eventId of eventsToQuery) {
          try {
            const scoresRef = collection(db, `events/${eventId}/scores`);
            const q = query(
              scoresRef,
              where("teamId", "==", team.id),
              where("category", "==", category)
            );

            const querySnapshot = await getDocs(q);
            const eventScores = querySnapshot.docs.map((doc) => ({
              id: doc.id,
              eventId: eventId, // Add eventId to each score
              ...doc.data(),
            }));

            allScores = [...allScores, ...eventScores];
          } catch (error) {
            console.error(
              `Error fetching scores from event ${eventId}:`,
              error
            );
          }
        }

        setScores(allScores);
      } catch (error) {
        console.error("Error fetching scores:", error);
        Alert.alert("Error", "Failed to load scores.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [team.id, category, selectedEvents]);

  // Helper function to get event name
  const getEventName = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    return event?.name || event?.title || eventId;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scores for {team.teamName}</Text>
        {selectedEvents.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 14, color: "#666", textAlign: "center" }}>
              Filtered by events:{" "}
              {selectedEvents
                .map((eventId: string) => getEventName(eventId))
                .join(", ")}
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={scores}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 10 }}>
            <ScoreCard score={item} category={category} />{" "}
            {/* Pass the category prop here */}
            {item.eventId && (
              <Text
                style={{
                  fontSize: 12,
                  color: "#888",
                  marginTop: 4,
                  textAlign: "center",
                  fontStyle: "italic",
                }}
              >
                Event: {getEventName(item.eventId)}
              </Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 50 }}>
            <Text style={{ fontSize: 16, color: "#666" }}>
              No scores found for this team.
            </Text>
            {selectedEvents.length > 0 && (
              <Text
                style={{
                  fontSize: 14,
                  color: "#888",
                  marginTop: 8,
                  textAlign: "center",
                }}
              >
                Try removing event filters to see all scores.
              </Text>
            )}
          </View>
        }
      />
    </View>
  );
}
