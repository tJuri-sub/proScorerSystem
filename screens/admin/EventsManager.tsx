import { useState, useEffect } from "react";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";

import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Dropdown } from "react-native-element-dropdown";

import styles from "../../components/styles/adminStyles/EventsStyle";

import { Feather, AntDesign } from "@expo/vector-icons";

export const EventsManager = () => {
  const navigation = useNavigation();
  const [eventModal, setEventModal] = useState<boolean>(false);
  const [events, setEvents] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);

  type EventInput = {
    title: string;
    date: string;
  };

  const [inputData, setInputData] = useState<EventInput>({
    title: "",
    date: "",
  });

  useEffect(() => {
    const fetchEvents = async () => {
      setLoadingEvents(true);
      const db = getFirestore();
      const snapshot = await getDocs(collection(db, "events"));
      const eventList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(eventList);
      setLoadingEvents(false);
    };
    fetchEvents();
  }, []);

  const handleCreateEvent = async () => {
    const db = getFirestore();
    try {
      if (!inputData.title || !inputData.date) {
        alert("Please fill all fields.");
        return;
      }
      setCreating(true);
      if (editingId) {
        await updateDoc(doc(db, "events", editingId), {
          title: inputData.title,
          date: inputData.date,
        });
        setEditingId(null);
      } else {
        await addDoc(collection(db, "events"), {
          title: inputData.title,
          date: inputData.date,
          createdAt: new Date().toISOString(),
        });
      }
      // Fetch updated events list
      setLoadingEvents(true); // <--- Add this
      const snapshot = await getDocs(collection(db, "events"));
      const eventList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(eventList);
      setInputData({ title: "", date: "" });
      setEventModal(false);
      setLoadingEvents(false); // <--- Add this
    } catch (error) {
      alert("Error creating/editing event.");
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const db = getFirestore();
    try {
      setLoadingEvents(true); // <--- Add this
      await deleteDoc(doc(db, "events", id));
      const snapshot = await getDocs(collection(db, "events"));
      const eventList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(eventList);
      setLoadingEvents(false); // <--- Add this
    } catch (error) {
      alert("Error deleting event.");
      console.error(error);
      setLoadingEvents(false);
    }
  };

  const handleEditEvent = (event: any) => {
    setInputData({
      title: event.title,
      date: event.date,
    });
    setEditingId(event.id); // Add editingId state
    setEventModal(true);
  };

  return (
    <View style={styles.container}>
      {loadingEvents ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#432344" />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.contentContainer}>
          <Image
            style={{
              width: 300,
              height: 250,
              alignSelf: "center",
            }}
            resizeMode="contain"
            source={require("../../assets/images/Logo.png")}
          />
          <Text style={styles.text}>Events Empty.</Text>
          <TouchableOpacity
            style={styles.addEventButton}
            onPress={() => setEventModal(true)}
          >
            <Text style={styles.textButton}>Create Event</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.eventContainer}>
          <View style={styles.createButtonHeader}>
            <TouchableOpacity
              style={styles.addEventButton}
              onPress={() => setEventModal(true)}
            >
              <Text style={styles.textButton}>
                <Text style={styles.addEventButton}>
                  {editingId ? "Edit Event" : "Create New Event"}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.eventList}>
            <FlatList
              data={events}
              keyExtractor={(item, idx) => idx.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() =>
                    (navigation as any).navigate("EventCategory", {
                      eventId: item.id,
                    })
                  }
                >
                  <View style={styles.eventCard}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <Text style={styles.eventDetail}>
                      Date of event: {item.date}
                    </Text>
                    <View style={{ flexDirection: "row", marginTop: 8 }}>
                      <TouchableOpacity
                        style={{ marginRight: 16 }}
                        onPress={() => handleEditEvent(item)}
                      >
                        <Feather name="edit" size={20} color="#432344" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteEvent(item.id)}
                      >
                        <AntDesign name="delete" size={20} color="red" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      )}

      {/* MODALS*/}
      <Modal transparent visible={eventModal}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#00000055",
          }}
        >
          <View style={styles.modal}>
            <View style={styles.headerModal}>
              <Text style={styles.headerTextModal}>Create New Event</Text>
            </View>

            <View style={{ marginBottom: 10, display: "flex", gap: 10 }}>
              <View>
                <Text style={styles.label}>Event Name</Text>
                <TextInput
                  style={styles.textModalInput}
                  placeholder="ex. PRO"
                  placeholderTextColor="#999"
                  value={inputData.title || ""}
                  onChangeText={(text) =>
                    setInputData((data) => ({ ...data, title: text }))
                  }
                />
              </View>

              <View>
                <Text style={styles.label}>Date of event</Text>
                <TextInput
                  style={styles.textModalInput}
                  placeholder="ex. 09/20/25"
                  placeholderTextColor="#999"
                  value={inputData.date || ""}
                  onChangeText={(text) =>
                    setInputData((data) => ({ ...data, date: text }))
                  }
                />
              </View>
            </View>

            <View
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 10,
              }}
            >
              <TouchableOpacity
                style={styles.button}
                onPress={() => setEventModal(false)}
              >
                <Text style={{ color: "red" }}>Cancel</Text>
              </TouchableOpacity>

              {creating ? (
                <ActivityIndicator
                  size="small"
                  color="#432344"
                  style={{ marginLeft: 10 }}
                />
              ) : (
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleCreateEvent}
                >
                  <Text style={{ color: "blue" }}>
                    {" "}
                    {editingId ? "Update Event" : "Create Event"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
