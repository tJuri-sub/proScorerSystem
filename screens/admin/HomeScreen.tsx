import React, { useState, useEffect, useLayoutEffect } from "react";
import {
  Text,
  View,
  Pressable,
  Modal,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Dimensions } from "react-native";
import styles from "../../components/styles/adminStyles/HomescreenStyle";
import { useFonts, Inter_400Regular } from "@expo-google-fonts/inter";

import { FIREBASE_AUTH, FIREBASE_DB } from "../../firebaseconfig";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  doc,
  collection,
  getDocs,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { Feather } from "@expo/vector-icons";

const { height: screenHeight } = Dimensions.get("window");
const { width: screenWidth } = Dimensions.get("window");

async function updateJudgeAvatars() {
  const db = getFirestore();
  const querySnapshot = await getDocs(collection(db, "judge-users"));
  querySnapshot.forEach(async (judgeDoc) => {
    const data = judgeDoc.data();
    if (!data.avatarUrl && data.username) {
      const avatarUrl = getRandomAvatar(data.username);
      await updateDoc(doc(db, "judge-users", judgeDoc.id), { avatarUrl });
    }
  });
}

function getRandomAvatar(username: string): string {
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
    username
  )}`;
}

export default function HomeScreenAdmin({ navigation }: any) {
  let [fontsLoaded] = useFonts({
    Inter_400Regular,
  });

  const [robomissionModalVisible, setRobomissionModalVisible] = useState(false);
  const [futureInnovatorsModalVisible, setFutureInnovatorsModalVisible] =
    useState(false);

  const [adminName, setAdminName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("Hello");
  const [lastLogin, setLastLogin] = useState<number | null>(null);

  // Initialize Firebase
  const auth = getAuth();
  const db = getFirestore();
  const user = FIREBASE_AUTH.currentUser;

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
    });
  }, [navigation]);

  const categorydata = [
    {
      label: "Robomission",
      value: "robomission",
      image: require("../../assets/images/RoboMissionLogo.png"),
      categoryDesc:
        "Build and program a robot that solves tasks on playing field",
      subcategories: [
        { label: "Elementary", value: "robo-elem" },
        { label: "Junior", value: "robo-junior" },
        { label: "Senior", value: "robo-senior" },
      ],
    },
    {
      label: "Robosports",
      value: "robosports",
      image: require("../../assets/images/RoboSportsLogo.png"),
      categoryDesc: "Teams compete with 2 robots in an exciting game",
    },

    {
      label: "Future Innovators",
      value: "future-innovators",
      image: require("../../assets/images/FutureILogo.png"),
      categoryDesc: "Work on project and design and build a robot",
      subcategories: [
        { label: "Elementary", value: "fi-elem" },
        { label: "Junior", value: "fi-junior" },
        { label: "Senior", value: "fi-senior" },
      ],
    },
    {
      label: "Future Engineers",
      value: "future-eng",
      image: require("../../assets/images/FutureELogo.png"),
      categoryDesc: "Advanced robotics following current research trends",
    },
  ];

  function getCategoryDisplayLabel(categoryValue: string) {
    for (const mainCat of categorydata) {
      if (mainCat.value === categoryValue) {
        return mainCat.label;
      }
      if (mainCat.subcategories) {
        const sub = mainCat.subcategories.find(
          (subcat) => subcat.value === categoryValue
        );
        if (sub) {
          return `${mainCat.label} ${sub.label}`;
        }
      }
    }
    return categoryValue;
  }

  useFocusEffect(
    React.useCallback(() => {
      const fetchAdminAvatar = async () => {
        const user = FIREBASE_AUTH.currentUser;
        if (user && user.email) {
          const userDoc = await getDoc(
            doc(FIREBASE_DB, "admin-users", user.email)
          );
          if (userDoc.exists()) {
            const data = userDoc.data();
            setAvatarUrl(
              data.avatarUrl ||
                `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
                  user.email
                )}`
            );
          }
        }
      };
      fetchAdminAvatar();
    }, [])
  );

  // Fetch admin profile info for header
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        if (user.email) {
          const userDoc = await getDoc(
            doc(FIREBASE_DB, "admin-users", user.email)
          );
          if (userDoc.exists()) {
            const data = userDoc.data();
            setAdminName(data.name || user.email);
            setAvatarUrl(
              data.avatarUrl ||
                `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
                  user.email
                )}`
            );
            setLastLogin(data.lastLogin || null);
            // Greeting logic
            if (
              data.lastLogin &&
              Date.now() - data.lastLogin < 24 * 60 * 60 * 1000
            ) {
              setGreeting("Welcome back");
            } else {
              const hour = new Date().getHours();
              if (hour < 12) setGreeting("Good morning");
              else if (hour < 18) setGreeting("Good afternoon");
              else setGreeting("Good evening");
            }
          } else {
            setAdminName(user.email);
            setAvatarUrl(
              `https://avatars.dicebear.com/api/identicon/${user.email}.svg`
            );
          }
        }
      }
    };
    fetchProfile();
  }, [user]);

  const cardWidth = screenWidth * 0.9;
  const cardGap = 16;
  const snapInterval = cardWidth + cardGap;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView>
          <View style={styles.container}>
            {/* Header with avatar, greeting, and name/email */}

            <Text style={styles.headerTexts}>Manage Team Categories</Text>

            {/* Manage Categories */}
            <View>
              <FlatList
                data={categorydata}
                keyExtractor={(item) => item.label}
                decelerationRate="fast"
                renderItem={({ item }) => {
                  const categoryColors: Record<string, string> = {
                    Robomission: "#E79300", // Orange
                    Robosports: "#35A22F", // Green
                    "Future Innovators": "#B01956", // Pink
                    "Future Engineers": "#0270AA", // Blue
                  };

                  const cardColor = categoryColors[item.label] || "#333";
                  const [firstWord, ...restWords] = item.label.split(" ");
                  const rest = restWords.join(" ");

                  return (
                    <Pressable
                      style={({ pressed }) => [
                        styles.card,
                        { backgroundColor: cardColor },
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={() => {
                        if (item.label === "Robomission") {
                          setRobomissionModalVisible(true);
                        } else if (item.label === "Future Innovators") {
                          setFutureInnovatorsModalVisible(true);
                        } else {
                          navigation.navigate("Category", {
                            category: item.value,
                            label: item.label,
                          });
                        }
                      }}
                    >
                      <View style={styles.cardHeader}>
                        <MaterialCommunityIcons
                          name="dots-vertical"
                          size={24}
                          color="white"
                        />
                      </View>
                      <Image source={item.image} style={styles.sideImage} />
                      <View style={styles.text}>
                        <Text>
                          <Text style={styles.cardTextThin}>{firstWord}</Text>
                          <Text
                            style={styles.cardText}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                          >
                            {rest}
                          </Text>
                        </Text>
                        <Text style={styles.cardDesc}>{item.categoryDesc}</Text>
                      </View>
                    </Pressable>
                  );
                }}
                ListEmptyComponent={<Text>No categories found.</Text>}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Robomission Modal */}
      <Modal
        visible={robomissionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRobomissionModalVisible(false)}
      >
        <View style={styles.modalOverlayCat}>
          <View style={styles.modalContentCat}>
            {/* Top-right cancel icon */}
            <Pressable
              style={styles.modalCloseIcon}
              onPress={() => setRobomissionModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="black" />
            </Pressable>

            {/* Modal Title */}
            <Text style={styles.modalTitleCat}>Robomission Categories</Text>

            {/* Buttons */}
            {categorydata[0].subcategories?.map((sub) => (
              <Pressable
                key={sub.value}
                style={styles.modalButtonCat}
                onPress={() => {
                  setRobomissionModalVisible(false);
                  navigation.navigate("Category", {
                    category: sub.value,
                    label: `Robomission ${sub.label}`,
                  });
                }}
              >
                <Text style={styles.modalButtonTextCat}>{sub.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* Future Innovators Modal */}
      <Modal
        visible={futureInnovatorsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFutureInnovatorsModalVisible(false)}
      >
        <View style={styles.modalOverlayCat}>
          <View style={styles.modalContentCat}>
            {/* Top-right cancel icon */}
            <Pressable
              style={styles.modalCloseIcon}
              onPress={() => setFutureInnovatorsModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="black" />
            </Pressable>

            {/* Modal Title */}
            <Text style={styles.modalTitleCat}>
              Future Innovators Categories
            </Text>

            {/* Buttons */}
            {categorydata[2].subcategories?.map((sub) => (
              <Pressable
                key={sub.value}
                style={[styles.modalButtonCat, { backgroundColor: "#B01956" }]}
                onPress={() => {
                  setFutureInnovatorsModalVisible(false);
                  navigation.navigate("Category", {
                    category: sub.value,
                    label: `Future Innovators ${sub.label}`,
                  });
                }}
              >
                <Text style={styles.modalButtonTextCat}>{sub.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaProvider>
  );
  // setEditJudge is now handled by useState above, so this function is not needed and can be removed.
}
