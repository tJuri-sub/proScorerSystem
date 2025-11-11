import { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  getDoc,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import DropDownPicker from "react-native-dropdown-picker";
import styles from "../../components/styles/adminStyles/EventsScreenStyle";
import { FontAwesome, FontAwesome6 } from "@expo/vector-icons";
import { Inter_400Regular, useFonts } from "@expo-google-fonts/inter";

const EventsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // Add null checks and default values
  const params =
    (route.params as { eventId?: string; category?: string }) || {};
  const { eventId, category } = params;

  const [fontsLoaded] = useFonts({ Inter_400Regular });

  /* EVENT STATES */
  const [event, setEvent] = useState<any>(null);

  /* JUDGES STATES */
  const [judges, setJudges] = useState<any[]>([]);
  const [assignModal, setAssignModal] = useState(false);
  const [selectedJudges, setSelectedJudges] = useState<string[]>([]);
  const [judgesDropdownOpen, setJudgesDropdownOpen] = useState(false);

  /* TEAMS STATES */
  const [teams, setTeams] = useState<any[]>([]);
  const [assignTeamsModal, setAssignTeamsModal] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [teamsDropdownOpen, setTeamsDropdownOpen] = useState(false);

  /* LOADING STATES */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch event and judges - Remove assignModal from dependencies
  useEffect(() => {
    if (!eventId || !category) {
      console.error("EventId or category is undefined");
      setLoading(false);
      return;
    }

    const fetchEventAndJudges = async () => {
      try {
        setLoading(true);
        const db = getFirestore();

        // Fetch event details
        const eventRef = doc(db, "events", eventId);
        const eventDoc = await getDoc(eventRef);

        if (!eventDoc.exists()) {
          console.error("Event not found");
          setLoading(false);
          return;
        }

        const eventData = eventDoc.data();
        setEvent(eventData);

        // Fetch judges matching event category and not disabled
        const judgesSnapshot = await getDocs(collection(db, "judge-users"));
        const judgeList = judgesSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              category: data.category,
              disabled: data.disabled ?? false,
            };
          })
          .filter((judge) => {
            const judgeCat = judge.category || "";
            const eventCat = category || "";
            return judgeCat === eventCat && !judge.disabled;
          });
        setJudges(judgeList);

        // Load assigned judges for this specific category
        const categoryJudges =
          eventData?.categoryData?.[category]?.judges || [];
        const filteredCategoryJudges = categoryJudges.filter((jid: string) =>
          judgeList.some((j) => j.id === jid)
        );
        setSelectedJudges(
          Array.isArray(filteredCategoryJudges) ? filteredCategoryJudges : []
        );
      } catch (error) {
        console.error("Error fetching event and judges:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndJudges();
  }, [eventId, category]); // Removed assignModal from dependencies

  // Add a separate useEffect to update selectedJudges when event changes
  useEffect(() => {
    if (event && category) {
      const categoryJudges = event?.categoryData?.[category]?.judges || [];
      const filteredCategoryJudges = categoryJudges.filter((jid: string) =>
        judges.some((j) => j.id === jid)
      );
      setSelectedJudges(
        Array.isArray(filteredCategoryJudges) ? filteredCategoryJudges : []
      );
    }
  }, [event, category, judges]);

  const handleSaveJudges = async () => {
    if (!eventId || !category) return;

    try {
      setSaving(true);
      const db = getFirestore();

      // Get current event data
      const eventRef = doc(db, "events", eventId);
      const eventDoc = await getDoc(eventRef);
      const currentData = eventDoc.data() || {};

      // Only save non-disabled judges
      const validJudges = selectedJudges.filter((jid) =>
        judges.some((j) => j.id === jid)
      );

      // Update the category-specific judges data
      const updatedCategoryData = {
        ...currentData.categoryData,
        [category]: {
          ...currentData.categoryData?.[category],
          judges: validJudges,
        },
      };

      await updateDoc(eventRef, {
        categoryData: updatedCategoryData,
      });
      setAssignModal(false);
    } catch (error) {
      console.error("Error saving judges:", error);
    } finally {
      setSaving(false);
    }
  };

  // Fetch teams
  useEffect(() => {
    const fetchTeams = async () => {
      if (!category || !event) return;

      try {
        const db = getFirestore();
        const teamsSnapshot = await getDocs(
          collection(db, "categories", category, "teams")
        );
        const teamList = teamsSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            return { id: doc.id, ...data, disabled: data.disabled ?? false };
          })
          .filter((team) => !team.disabled);
        setTeams(teamList);

        // Load assigned teams for this specific category
        const categoryTeams = event?.categoryData?.[category]?.teams || [];
        const filteredCategoryTeams = categoryTeams.filter((tid: string) =>
          teamList.some((t) => t.id === tid)
        );
        setSelectedTeams(
          Array.isArray(filteredCategoryTeams) ? filteredCategoryTeams : []
        );
      } catch (error) {
        console.error("Error fetching teams:", error);
      }
    };

    fetchTeams();
  }, [event, assignTeamsModal, category]);

  const handleSaveTeams = async () => {
    if (!eventId || !category) return;

    try {
      setSaving(true);
      const db = getFirestore();

      // Get current event data
      const eventRef = doc(db, "events", eventId);
      const eventDoc = await getDoc(eventRef);
      const currentData = eventDoc.data() || {};

      // Only save non-disabled teams
      const validTeams = selectedTeams.filter((tid) =>
        teams.some((t) => t.id === tid)
      );

      // Update the category-specific teams data
      const updatedCategoryData = {
        ...currentData.categoryData,
        [category]: {
          ...currentData.categoryData?.[category],
          teams: validTeams,
        },
      };

      await updateDoc(eventRef, {
        categoryData: updatedCategoryData,
      });

      // Update the event state with the new data
      const updatedEvent = {
        ...currentData,
        categoryData: updatedCategoryData,
      };
      setEvent(updatedEvent);

      setAssignTeamsModal(false);
    } catch (error) {
      console.error("Error saving teams:", error);
    } finally {
      setSaving(false);
    }
  };

  // Navigation to Leaderboard and OverallScores
  const handleNavigateLeaderboard = () => {
    (navigation as any).navigate("EventLeaderboard", {
      category: category,
      date: event?.date,
      eventId,
    });
  };

  const handleNavigateOverallScores = () => {
    (navigation as any).navigate("EventScores", {
      category: category,
      date: event?.date,
      eventId,
    });
  };

  // Show error state if eventId or category is missing
  if (!eventId || !category) {
    return (
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text style={{ fontSize: 18, color: "red" }}>
          Error: Event ID or Category is missing. Please navigate back and try
          again.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, alignItems: "center", padding: 20 }}
    >
      {loading ? (
        <ActivityIndicator size="large" color="#432344" />
      ) : (
        <>
          <View style={stickyStyles.headerContainer}>
            <Text style={stickyStyles.eventTitle}>{event?.title}</Text>
            <Text style={stickyStyles.eventInfo}>{event?.date}</Text>
            <Text style={styles.catTitleText}>Category: {category}</Text>
          </View>

          {/* Navigation Buttons */}
          <View style={styles.navButtons}>
            <TouchableOpacity
              style={styles.leaderboardButton}
              onPress={handleNavigateLeaderboard}
            >
              <FontAwesome6 name="ranking-star" size={24} color="white" />
              <Text style={styles.buttonText}>Leaderboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.overallScoresButton}
              onPress={handleNavigateOverallScores}
            >
              <FontAwesome name="table" size={24} color="white" />
              <Text style={styles.buttonText}>Overall Scores</Text>
            </TouchableOpacity>
          </View>

          {/* ASSIGN JUDGES SECTION */}
          <View style={{ width: "100%" }}>
            <Text style={styles.judgeListHeader}>
              Assigned Judges for {category}:
            </Text>
            {selectedJudges.length === 0 ? (
              <Text style={{ fontFamily: "inter_400Regular", fontSize: 14 }}>
                No judges assigned for this category.
              </Text>
            ) : (
              <View>
                {selectedJudges.map((judgeId, idx) => {
                  const judge = judges.find((j) => j.id === judgeId);
                  return (
                    <View
                      key={judgeId}
                      style={{
                        flexDirection: "row",
                        display: "flex",
                        gap: 8,
                        marginBottom: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: "inter_400Regular",
                        }}
                      >
                        {idx + 1}.
                      </Text>
                      <Text style={styles.judgeNameList}>
                        {judge ? judge.username : judgeId}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={{
              marginTop: 10,
              width: "100%",
              padding: 10,
              backgroundColor: "#432344",
              borderRadius: 5,
            }}
            onPress={() => setAssignModal(true)}
          >
            <Text
              style={{
                color: "#fff",
                fontFamily: "inter_400Regular",
                textAlign: "center",
              }}
            >
              Assign Judges
            </Text>
          </TouchableOpacity>

          {/* Assign Judges Modal */}
          <Modal transparent visible={assignModal} animationType="slide">
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#00000055",
              }}
            >
              <View
                style={{
                  backgroundColor: "#fff",
                  padding: 20,
                  borderRadius: 7,
                  width: "80%",
                }}
              >
                <Text
                  style={{
                    fontFamily: "inter_400Regular",
                    fontWeight: "bold",
                    fontSize: 18,
                    marginBottom: 10,
                  }}
                >
                  Assign Judges for {category}
                </Text>
                <DropDownPicker
                  open={judgesDropdownOpen}
                  setOpen={setJudgesDropdownOpen}
                  multiple={true}
                  value={selectedJudges}
                  setValue={setSelectedJudges}
                  items={judges.map((j) => ({
                    label: j.username,
                    value: j.id,
                  }))}
                  placeholder="Select Judges"
                  searchable={true}
                  min={0}
                  max={100}
                  style={{
                    marginBottom: 20,
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 6,
                    padding: 8,
                  }}
                  dropDownContainerStyle={{
                    borderWidth: 1,
                    borderColor: "#aaa",
                    borderRadius: 8,
                    backgroundColor: "#fafafa",
                    elevation: 2, // Android shadow
                    shadowColor: "#000", // iOS shadow
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                  }}
                  // List item styling
                  listItemContainerStyle={{
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                  }}
                  listItemLabelStyle={{
                    fontSize: 16,
                    color: "#333",
                  }}
                  selectedItemContainerStyle={{
                    backgroundColor: "#e6f7ff",
                  }}
                  selectedItemLabelStyle={{
                    fontWeight: "600",
                    color: "#007acc",
                  }}
                  searchTextInputStyle={{
                    borderRadius: 3,
                    borderColor: "#ccc",
                  }}
                />

                <View style={{ marginBottom: 10 }}>
                  <Text style={{ fontWeight: "bold", marginBottom: 10 }}>
                    Selected Judges:
                  </Text>
                  {selectedJudges.length === 0 ? (
                    <Text>No judges selected.</Text>
                  ) : (
                    <ScrollView style={{ height: 100 }}>
                      {selectedJudges.map((judgeId) => {
                        const judge = judges.find((j) => j.id === judgeId);
                        return (
                          <View
                            key={judgeId}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              display: "flex",
                              marginVertical: 3,
                            }}
                          >
                            <Text>{judge ? judge.username : judgeId}</Text>
                            <TouchableOpacity
                              onPress={() =>
                                setSelectedJudges(
                                  selectedJudges.filter((id) => id !== judgeId)
                                )
                              }
                              style={{
                                marginLeft: 8,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                backgroundColor: "#eee",
                                borderRadius: 4,
                              }}
                            >
                              <Text style={{ color: "red" }}>Remove</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>

                <View
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-end",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setAssignModal(false)}
                    style={{ marginRight: 20 }}
                  >
                    <Text style={{ color: "red" }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveJudges}
                    disabled={saving}
                    style={{
                      backgroundColor: "#432344",
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 6,
                    }}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ color: "#fff" }}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          {/* ASSIGN JUDGES SECTION ----------- ENDS*/}

          {/* TEAMS SECTION */}
          <View style={{ marginTop: 20, width: "100%" }}>
            <Text style={styles.judgeListHeader}>
              Assigned Teams for {category}:
            </Text>
            {selectedTeams.length === 0 ? (
              <Text style={{ fontFamily: "inter_400Regular", fontSize: 14 }}>
                No teams assigned for this category.
              </Text>
            ) : (
              selectedTeams.map((teamId) => {
                const team = teams.find((t) => t.id === teamId);
                return (
                  <View
                    key={teamId}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 2,
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flex: 1,
                        gap: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: "inter_400Regular",
                          marginRight: 4,
                        }}
                      >
                        {selectedTeams.indexOf(teamId) + 1}.
                      </Text>
                      <Text
                        style={{
                          flex: 1,
                          flexWrap: "wrap",
                          fontFamily: "inter_400Regular",
                        }}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {team ? team.teamName || team.name || teamId : teamId}
                      </Text>
                    </View>

                    {/* <TouchableOpacity
                      onPress={() =>
                        setSelectedTeams(
                          selectedTeams.filter((id) => id !== teamId)
                        )
                      }
                      style={{
                        marginLeft: 8,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        backgroundColor: "#e3e3e3ff",
                        borderRadius: 4,
                        alignSelf: "flex-end",
                        maxWidth: 80,
                      }}
                    >
                      <Text style={{ color: "red", textAlign: "center" }}>
                        Remove
                      </Text>
                    </TouchableOpacity> */}
                  </View>
                );
              })
            )}
          </View>

          <TouchableOpacity
            style={{
              marginTop: 10,
              width: "100%",
              padding: 10,
              backgroundColor: "#432344",
              borderRadius: 5,
            }}
            onPress={() => setAssignTeamsModal(true)}
          >
            <Text style={{ color: "#fff", textAlign: "center" }}>
              Assign Teams
            </Text>
          </TouchableOpacity>

          {/* Assign Teams Modal */}
          <Modal transparent visible={assignTeamsModal} animationType="slide">
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#00000055",
              }}
            >
              <View
                style={{
                  backgroundColor: "#fff",
                  padding: 20,
                  borderRadius: 10,
                  width: 320,
                }}
              >
                <Text
                  style={{ fontWeight: "bold", fontSize: 18, marginBottom: 10 }}
                >
                  Assign Teams for {category}
                </Text>
                <DropDownPicker
                  open={teamsDropdownOpen}
                  setOpen={setTeamsDropdownOpen}
                  multiple={true}
                  value={selectedTeams}
                  setValue={setSelectedTeams}
                  items={teams.map((t) => ({
                    label: t.teamName || t.name || "Unnamed Team",
                    value: t.id,
                  }))}
                  placeholder="Select Teams"
                  searchable={true}
                  min={0}
                  max={100}
                  style={{
                    marginBottom: 20,
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 6,
                    padding: 8,
                  }}
                  dropDownContainerStyle={{
                    borderWidth: 1,
                    borderColor: "#aaa",
                    borderRadius: 8,
                    backgroundColor: "#fafafa",
                    elevation: 2, // Android shadow
                    shadowColor: "#000", // iOS shadow
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                  }}
                  // List item styling
                  listItemContainerStyle={{
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                  }}
                  listItemLabelStyle={{
                    fontSize: 16,
                    color: "#333",
                  }}
                  selectedItemContainerStyle={{
                    backgroundColor: "#e6f7ff",
                  }}
                  selectedItemLabelStyle={{
                    fontWeight: "600",
                    color: "#007acc",
                  }}
                  searchTextInputStyle={{
                    borderRadius: 3,
                    borderColor: "#ccc",
                  }}
                />
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ fontWeight: "bold" }}>Selected Teams:</Text>
                  {selectedTeams.length === 0 ? (
                    <Text>No teams selected.</Text>
                  ) : (
                    <ScrollView style={{ height: 100 }}>
                      {selectedTeams.map((teamId) => {
                        const team = teams.find((t) => t.id === teamId);
                        return (
                          <View
                            key={teamId}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginBottom: 2,
                            }}
                          >
                            <Text>
                              {team
                                ? team.teamName || team.name || teamId
                                : teamId}
                            </Text>
                            <TouchableOpacity
                              onPress={() =>
                                setSelectedTeams(
                                  selectedTeams.filter((id) => id !== teamId)
                                )
                              }
                              style={{
                                marginLeft: 8,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                backgroundColor: "#eee",
                                borderRadius: 4,
                              }}
                            >
                              <Text style={{ color: "red" }}>Remove</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
                <View
                  style={{ flexDirection: "row", justifyContent: "flex-end" }}
                >
                  <TouchableOpacity
                    onPress={() => setAssignTeamsModal(false)}
                    style={{ marginRight: 20 }}
                  >
                    <Text style={{ color: "red" }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveTeams}
                    disabled={saving}
                    style={{
                      backgroundColor: "#432344",
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 6,
                    }}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ color: "#fff" }}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
          {/* TEAMS SECTION ----------- ENDS*/}
        </>
      )}
    </ScrollView>
  );
};

const stickyStyles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#432344",
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    width: "100%",
  },

  eventTitle: {
    fontFamily: "inter_400Regular",
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },

  eventInfo: {
    fontFamily: "inter_400Regular",
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
  },
});

export default EventsScreen;
