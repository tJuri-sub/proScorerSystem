import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  Text,
  View,
  Image,
  FlatList,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { FIREBASE_AUTH, FIREBASE_DB } from "../../firebaseconfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import styles from "../../components/styles/judgeStyles/HomepageStyle";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFonts, Inter_400Regular } from "@expo-google-fonts/inter";
import { useLogoutModal } from "../../components/component/LogoutModalContent";

/* ===========================
   🔹 Constants & Helpers
=========================== */
const CATEGORY_DATA = [
  {
    label: "Robomission",
    value: "robomission",
    image: require("../../assets/images/RoboMissionLogo.png"),
    desc: "Build and program a robot that solves tasks on playing field",
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
    desc: "Teams compete with 2 robots in an exciting game",
  },
  {
    label: "Future Innovators",
    value: "future-innovators",
    image: require("../../assets/images/FutureILogo.png"),
    desc: "Work on project and design and build a robot",
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
    desc: "Advanced robotics following current research trends",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Robomission: "#E79300",
  Robosports: "#35A22F",
  "Future Innovators": "#B01956",
  "Future Engineers": "#0270AA",
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  const random = ["Hello", "Good day", "Hi"];
  return random[Math.floor(Math.random() * random.length)];
};

const getAvatarUrl = (email?: string, fallback = "default") =>
  `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
    email || fallback
  )}`;

const resolveCategoryLabel = (judgeCategory: string | null) => {
  if (!judgeCategory) return "No category assigned";

  const top = CATEGORY_DATA.find((cat) => cat.value === judgeCategory);
  if (top) return top.label;

  for (const cat of CATEGORY_DATA) {
    const sub = cat.subcategories?.find((s) => s.value === judgeCategory);
    if (sub) return `${cat.label} ${sub.label}`;
  }
  return judgeCategory;
};

/* ===========================
   🔹 UI Subcomponents
=========================== */
const ProfileHeader = ({
  avatarUrl,
  greeting,
  judgeName,
  judgeCategory,
}: any) => (
  <View style={styles.header}>
    <View style={styles.profileCard}>
      <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      <View style={styles.nameContainer}>
        <Text style={styles.greeting}>{greeting}!</Text>
        <Text style={styles.name}>Judge {judgeName}</Text>
      </View>
    </View>
    <Text style={styles.categoryAssigned}>
      {resolveCategoryLabel(judgeCategory)}
    </Text>
  </View>
);

const CategoryCard = ({ item, onPress }: any) => {
  const color = CATEGORY_COLORS[item.label] || "#333";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: color },
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="dots-vertical" size={24} color="white" />
      </View>
      <Image source={item.image} style={styles.sideImage} />

      <View style={styles.ContainerCategory}>
        {item.label.split(" ").map((word: string, i: number) => (
          <Text
            key={i}
            style={i === 0 ? styles.cardTextThin : styles.cardText}
            adjustsFontSizeToFit
          >
            {word}{" "}
          </Text>
        ))}
        <Text style={styles.cardDesc} numberOfLines={3} adjustsFontSizeToFit>
          {item.desc}
        </Text>
      </View>
    </Pressable>
  );
};

const CategoryModal = ({
  visible,
  onClose,
  title,
  subcategories,
  color,
  navigation,
  judgeCategory,
}: any) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlayCat}>
      <View style={styles.modalContentCat}>
        <Pressable style={styles.modalCloseIcon} onPress={onClose}>
          <Ionicons name="close" size={24} color="black" />
        </Pressable>
        <Text style={styles.modalTitleCat}>{title}</Text>

        {subcategories?.map((sub: any) => (
          <Pressable
            key={sub.value}
            style={[styles.modalButtonCat, color && { backgroundColor: color }]}
            onPress={() => {
              onClose();
              navigation.navigate("CategoryScreen", {
                category: sub.value,
                label: `${title.split(" ")[0]} ${sub.label}`,
                judgeCategory,
              });
            }}
          >
            <Text style={styles.modalButtonTextCat}>{sub.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  </Modal>
);

/* ===========================
   🔹 Main Component
=========================== */
export default function HomeScreen({ navigation }: any) {
  const [fontsLoaded] = useFonts({ Inter_400Regular });
  const [judgeName, setJudgeName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [greeting, setGreeting] = useState(getGreeting());
  const [robomissionModal, setRobomissionModal] = useState(false);
  const [futureInnovatorsModal, setFutureInnovatorsModal] = useState(false);
  const [judgeCategory, setJudgeCategory] = useState<string | null>(null);

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, (user) => {
      if (!user) navigation.replace("LoginScreen");
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const userDoc = await getDoc(doc(FIREBASE_DB, "judge-users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setJudgeName(data.username || user.email);
        setJudgeCategory(data.category || null);
        setAvatarUrl(data.avatarUrl || getAvatarUrl(user.email ?? undefined));
      } else {
        setJudgeName(user.email);
        setAvatarUrl(getAvatarUrl(user.email ?? undefined));
      }
    };
    fetchProfile();
  }, [user]);

  return (
    <SafeAreaProvider>
      <ScrollView>
        <SafeAreaView style={[styles.safeArea, { flex: 1 }]}>
          <ProfileHeader
            avatarUrl={avatarUrl}
            greeting={greeting}
            judgeName={judgeName}
            judgeCategory={judgeCategory}
          />

          <View style={styles.categoryContainer}>
            <Text style={styles.categorytitleText}>Competition Categories</Text>
          </View>

          <FlatList
            data={CATEGORY_DATA}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <CategoryCard
                item={item}
                onPress={() => {
                  if (item.label === "Robomission") setRobomissionModal(true);
                  else if (item.label === "Future Innovators")
                    setFutureInnovatorsModal(true);
                  else {
                    navigation.navigate("CategoryScreen", {
                      category: item.value,
                      label: item.label,
                      judgeCategory,
                    });
                  }
                }}
              />
            )}
            contentContainerStyle={{ paddingBottom: 1 }}
          />
        </SafeAreaView>
      </ScrollView>

      {/* Modals */}
      <CategoryModal
        visible={robomissionModal}
        onClose={() => setRobomissionModal(false)}
        title="Robomission Categories"
        subcategories={CATEGORY_DATA[0].subcategories}
        navigation={navigation}
        judgeCategory={judgeCategory}
      />
      <CategoryModal
        visible={futureInnovatorsModal}
        onClose={() => setFutureInnovatorsModal(false)}
        title="Future Innovators Categories"
        subcategories={CATEGORY_DATA[2].subcategories}
        color="#B01956"
        navigation={navigation}
        judgeCategory={judgeCategory}
      />
    </SafeAreaProvider>
  );
}
