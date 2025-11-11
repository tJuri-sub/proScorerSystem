import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import styles from "../../components/styles/judgeStyles/CategoryStyling";
import { AntDesign, Feather } from "@expo/vector-icons";
import DropDownPicker from "react-native-dropdown-picker";

interface TeamData {
  id: string;
  category: string;
  teamNumber: number;
  teamName?: string;
  country?: string;
  countryName?: string;
  podNumber?: string;
  members?: string[];
  coachName?: string;
  disabled?: boolean;
  eventId?: string;
  [key: string]: any;
}

interface EventData {
  id: string;
  name?: string;
  title?: string;
  [key: string]: any;
}

export default function CategoryScreenJudge({ route, navigation }: any) {
  const { category, label, judgeCategory } = route.params;
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and pagination state
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // Filter state for events and countries
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);

  // Dropdown specific states
  const [openEventDropdown, setOpenEventDropdown] = useState(false);
  const [eventItems, setEventItems] = useState<any[]>([]);
  const [showCountryFilter, setShowCountryFilter] = useState(false);

  const db = getFirestore();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: `${label} Teams`,
      headerTitleAlign: "center",
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 15 }}
        >
          <AntDesign name="arrowleft" size={24} color="#432344" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, label, teams.length]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch events where judge is assigned to this category
        const eventsSnapshot = await getDocs(collection(db, "events"));

        const assignedEvents: any[] = [];
        const allTeamsList: TeamData[] = [];

        // Get current user (judge) ID - you'll need to import FIREBASE_AUTH
        const user = { uid: "current-judge-id" }; // Replace with actual auth user

        for (const eventDoc of eventsSnapshot.docs) {
          const eventData = eventDoc.data();

          const categoryData = eventData.categoryData;

          // Check if judge is assigned to this event's category
          if (
            categoryData &&
            categoryData[category] &&
            categoryData[category].judges
          ) {
            const assignedJudges = categoryData[category].judges || [];

            // For now, let's fetch all events since we don't have judge auth in this context
            // In your actual app, replace this with: assignedJudges.includes(user.uid)
            if (true) {
              // Replace with proper judge check: assignedJudges.includes(user.uid)
              assignedEvents.push({
                id: eventDoc.id,
                title: eventData.title || eventData.name || "Unnamed Event",
                date: eventData.date || "",
                ...eventData,
              });

              // Get teams assigned to this judge for this event and category
              const assignedTeamIds = categoryData[category].teams || [];

              // Fetch team details from the main teams collection
              if (assignedTeamIds.length > 0) {
                const teamsPath = `categories/${category}/teams`;

                const querySnapshot = await getDocs(collection(db, teamsPath));

                querySnapshot.docs.forEach((teamDoc) => {
                  const data = teamDoc.data();

                  // Only include teams that are assigned to this event
                  if (assignedTeamIds.includes(teamDoc.id)) {
                    allTeamsList.push({
                      id: teamDoc.id,
                      category: category,
                      teamNumber: data.teamNumber ?? 0,
                      teamName: data.teamName,
                      country: data.country,
                      countryName: data.countryName,
                      podNumber: data.podNumber,
                      members: data.members,
                      coachName: data.coachName,
                      disabled: data.disabled,
                      eventId: eventDoc.id, // Set the eventId to match the event
                      ...data,
                    });
                  }
                });
              }
            }
          }
        }

        // Sort by team number ascending
        allTeamsList.sort((a, b) => (a.teamNumber ?? 0) - (b.teamNumber ?? 0));
        setTeams(allTeamsList);

        // Extract unique countries
        const uniqueCountries = [
          ...new Set(
            allTeamsList.map(
              (team) => team.countryName || team.country || "N/A"
            )
          ),
        ]
          .filter((country) => country !== "N/A")
          .sort();

        setCountries(uniqueCountries);

        // Set up event dropdown items
        const dropdownItems = assignedEvents.map((event) => ({
          label: event.title || "Unnamed Event",
          value: event.id,
        }));

        setEventItems(dropdownItems);

        // Set the first assigned event as default if available
        if (assignedEvents.length > 0) {
          setSelectedEventId(assignedEvents[0].id);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [category]);

  // Filter teams by search, country, not disabled, and selected event
  const filteredTeams = teams
    .filter((item) => {
      return !item.disabled;
    })
    .filter((item) => {
      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        item.teamName?.toLowerCase().includes(searchLower) ||
        String(item.teamNumber).includes(searchLower);

      // Country filter
      const teamCountry = item.countryName || item.country || "N/A";
      const matchesCountry =
        selectedCountries.length === 0 ||
        selectedCountries.includes(teamCountry);

      // Event filter: Show teams that either:
      // 1. Have no eventId (legacy teams)
      // 2. Have eventId matching selected event
      // 3. No event is selected (show all)
      const matchesEvent =
        !selectedEventId || !item.eventId || item.eventId === selectedEventId;

      return matchesSearch && matchesCountry && matchesEvent;
    });

  // Pagination logic
  const totalRecords = filteredTeams.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = filteredTeams.slice(startIndex, endIndex);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading teams and events...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Search Bar */}
      <View
        style={{
          backgroundColor: "#432344",
          paddingHorizontal: 15,
          paddingVertical: 15,
        }}
      >
        <TextInput
          style={{
            borderWidth: 1,
            borderRadius: 4,
            padding: 7,
            borderColor: "#e0e0e0",
            backgroundColor: "#fafafa",
            marginBottom: 12,
            fontSize: 14,
          }}
          placeholder="search team name or number"
          placeholderTextColor="#999"
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setCurrentPage(1);
          }}
        />

        {/* Event Dropdown Filter */}
        <View style={{ zIndex: 1000, marginBottom: 12 }}>
          <DropDownPicker
            open={openEventDropdown}
            value={selectedEventId}
            items={eventItems}
            setOpen={setOpenEventDropdown}
            setValue={(callback) => {
              const newValue =
                typeof callback === "function"
                  ? callback(selectedEventId)
                  : callback;

              setSelectedEventId(newValue);
              setCurrentPage(1);
            }}
            setItems={setEventItems}
            placeholder="Select an Event (or leave empty for all)"
            containerStyle={{
              height: 40, // Fixed height - don't change this
              marginBottom: 0,
            }}
            style={{
              backgroundColor: "#fafafa",
              borderColor: "#e0e0e0",
              borderRadius: 4,
              minHeight: 40,
            }}
            itemSeparator={true}
            itemSeparatorStyle={{ backgroundColor: "#e0e0e0" }}
            dropDownContainerStyle={{
              backgroundColor: "#fff",
              borderColor: "#e0e0e0",
              position: "absolute", // This makes the dropdown overlay instead of pushing content
              top: 40, // Position it right below the picker
              zIndex: 1000,
            }}
            labelStyle={{ color: "#000" }}
            selectedItemLabelStyle={{ fontWeight: "bold", color: "#432344" }}
            onOpen={() => setShowCountryFilter(false)}
            zIndex={1000}
            zIndexInverse={999}
            listMode="SCROLLVIEW" // Better performance for smaller lists
            maxHeight={200} // Limit the dropdown height
          />
        </View>

        {/* Add button to clear event filter */}
        <TouchableOpacity
          onPress={() => {
            setSelectedEventId(null);
            setCurrentPage(1);
          }}
          style={{
            padding: 8,
            backgroundColor: "#ddd",
            borderRadius: 4,
            marginBottom: 12,
          }}
        >
          <Text style={{ textAlign: "center", fontSize: 14 }}>
            Show All Events
          </Text>
        </TouchableOpacity>

        {/* Country Filter Button */}
        <View
          style={{ flexDirection: "row", marginBottom: 12, gap: 8, zIndex: 1 }}
        >
          <TouchableOpacity
            onPress={() => setShowCountryFilter(!showCountryFilter)}
            style={{
              padding: 8,
              backgroundColor:
                selectedCountries.length > 0 ? "#432344" : "#e0e0e0",
              borderRadius: 4,
              flex: 1,
            }}
          >
            <Text
              style={{
                color: selectedCountries.length > 0 ? "#fff" : "#666",
                textAlign: "center",
              }}
            >
              Countries ({selectedCountries.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Country Filter Dropdown */}
        {showCountryFilter && (
          <View
            style={{
              backgroundColor: "#f5f5f5",
              padding: 10,
              borderRadius: 4,
              zIndex: 1,
              // optional: limit the whole box if you like
              // maxHeight: 300,
            }}
          >
            <Text style={{ fontWeight: "bold", marginBottom: 8 }}>
              Select Countries:
            </Text>

            {/* Scrollable list */}
            <ScrollView
              style={{
                maxHeight: 230, // ✅ adjust as needed
              }}
            >
              {countries.map((country) => (
                <TouchableOpacity
                  key={country}
                  onPress={() => {
                    if (selectedCountries.includes(country)) {
                      setSelectedCountries(
                        selectedCountries.filter((c) => c !== country)
                      );
                    } else {
                      setSelectedCountries([...selectedCountries, country]);
                    }
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: 8,
                    backgroundColor: selectedCountries.includes(country)
                      ? "#432344"
                      : "#fff",
                    marginVertical: 2,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: "#e0e0e0",
                  }}
                >
                  <Text
                    style={{
                      color: selectedCountries.includes(country)
                        ? "#fff"
                        : "#000",
                    }}
                  >
                    {country}
                  </Text>
                </TouchableOpacity>
              ))}
              {countries.length === 0 && (
                <Text style={{ color: "#666", fontStyle: "italic" }}>
                  No countries found
                </Text>
              )}
            </ScrollView>
          </View>
        )}
      </View>

      <View style={styles.container}>
        <FlatList
          data={currentRecords}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                if (
                  item.category?.toLowerCase().trim() ===
                  judgeCategory?.toLowerCase().trim()
                ) {
                  navigation.navigate("TeamScoresScreen", {
                    team: item,
                    category,
                    selectedEventId: selectedEventId,
                  });
                }
              }}
            >
              <View style={styles.teamCard}>
                {/* Top ribbon: Team & Table numbers */}
                <View style={styles.cardTopBar}>
                  <Text style={styles.topBarText}>Team #{item.teamNumber}</Text>
                  <Text style={styles.topBarText}>Table #{item.podNumber}</Text>
                </View>

                {/* Middle: Team name & Country side-by-side */}
                <View style={styles.teamInfoRow}>
                  <Text style={styles.teamName}>{item.teamName}</Text>
                  <Text style={styles.country}>
                    {item.countryName || item.country || "N/A"}
                  </Text>
                </View>

                {/* Members grid */}
                <View style={styles.membersBlock}>
                  {(item.members || []).map((m: any, i: any) => (
                    <Text style={styles.member} key={i}>
                      • {m || `Member ${i + 1}: -`}
                    </Text>
                  ))}
                </View>

                {/* Coach */}
                <View style={styles.coachRow}>
                  <Text style={styles.coachLabel}>Coach</Text>
                  <Text style={styles.coachName}>{item.coachName || "-"}</Text>
                </View>

                {/* Footer / debug */}
                <Text style={styles.footerNote}>
                  Event ID: {item.eventId || "None"} | Disabled:{" "}
                  {item.disabled ? "Yes" : "No"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{ padding: 20 }}>
              <Text style={{ textAlign: "center", marginBottom: 10 }}>
                No teams found for the selected event and filters.
              </Text>
              <Text
                style={{ textAlign: "center", fontSize: 12, color: "#666" }}
              >
                Total teams in category: {teams.length}
              </Text>
              <Text
                style={{ textAlign: "center", fontSize: 12, color: "#666" }}
              >
                After filters: {filteredTeams.length}
              </Text>
            </View>
          }
        />

        {/* Pagination Controls */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: 10,
          }}
        >
          <TouchableOpacity
            onPress={handlePreviousPage}
            disabled={currentPage === 1}
            style={{
              padding: 8,
              marginHorizontal: 8,
              backgroundColor: currentPage === 1 ? "#eee" : "#432344",
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
              backgroundColor: currentPage === totalPages ? "#eee" : "#432344",
              borderRadius: 6,
            }}
          >
            <Text
              style={{ color: currentPage === totalPages ? "#aaa" : "#fff" }}
            >
              <AntDesign name="right" size={16} color="black" />
            </Text>
          </TouchableOpacity>
        </View>
        {/* Records summary */}
        <Text
          style={{
            marginBottom: 5,
            marginTop: 5,
            color: "#555",
            textAlign: "center",
          }}
        >
          Showing {currentRecords.length} of {filteredTeams.length} teams
        </Text>
      </View>
    </View>
  );
}
