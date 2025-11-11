import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  StatusBar,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";

//Global
import VerifyEmailScreen from "./screens/accountManage/VerifyEmailScreen";

//Judges
import Leaderboard from "./screens/judges/Leaderboard";
import HomeScreen from "./screens/judges/HomeScreen";
import LoginJudge from "./screens/LoginScreenJudge";
import CategoryScreenJudge from "./screens/judges/CategoryScreen";
import ScorerScreen from "./screens/judges/ScorerScreen";
import AllScoresScreen from "./screens/judges/AllScoresScreen";
import TeamScoresScreen from "./screens/judges/TeamScoresScreen";
import AllLeaderboardScreen from "./screens/judges/AllLeaderboardScreen";

//Admin
import HomeScreenAdmin from "./screens/admin/HomeScreen";
import Login from "./screens/LoginScreenAdmin";
import SignUp from "./screens/SignUpScreenAdmin";
import CategoryScreen from "./screens/admin/CategoryScreen";
import TeamScores from "./screens/admin/TeamScores";
import EventsScreen from "./screens/admin/EventsScreen";
import EventCategories from "./screens/admin/EventCategories";
import EventLeaderboard from "./screens/admin/EventLeaderboard";
import EventScores from "./screens/admin/EventScores";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { FIREBASE_AUTH } from "./firebaseconfig";
import { doc, getDoc } from "firebase/firestore";
import { FIREBASE_DB } from "./firebaseconfig";
import AllJudgesScreen from "./screens/admin/AllJudgesScreen";
import { AntDesign, FontAwesome6 } from "@expo/vector-icons";
import JudgeDrawerNavigator from "./components/component/judgeDrawer/JudgeDrawerNavigator";
import { LogoutModalProvider } from "./components/component/LogoutModalContent";
import DrawerNavigator from "./components/component/adminDrawer/DrawerNavigator";
import ProfileAdmin from "./screens/admin/Profile";
import OverallScoresScreen from "./screens/admin/OverallScores";
import AllLeaderboard from "./screens/admin/Leaderboard";

const Stack = createNativeStackNavigator();
const InsideStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const AdminTab = createBottomTabNavigator();

const JudgeInsideStackNavigator = () => (
  <InsideStack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <InsideStack.Screen
      name="JudgeDrawer"
      component={JudgeDrawerNavigator}
      options={{ headerShown: false }}
    />
    <InsideStack.Screen name="Home" component={HomeScreen} />
    <InsideStack.Screen name="Leaderboard" component={Leaderboard} />
    <InsideStack.Screen
      name="AllLeaderboardScreen"
      component={AllLeaderboardScreen}
      options={({ navigation }) => ({
        headerShown: true,
        headerTitle: "Rankings",
        headerTitleAlign: "center",
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginLeft: 15 }}
          >
            <AntDesign name="arrowleft" size={24} color="#432344" />
          </TouchableOpacity>
        ),
      })}
    />
    <InsideStack.Screen
      name="CategoryScreen"
      component={CategoryScreenJudge}
      options={{ headerShown: true }}
    />
    <InsideStack.Screen name="Scorer" component={ScorerScreen} />
    <InsideStack.Screen
      name="AllScoresScreen"
      component={AllScoresScreen}
      options={({ navigation }) => ({
        headerShown: true,
        headerTitle: "Profile",
        headerTitleAlign: "center",
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginLeft: 15 }}
          >
            <AntDesign name="arrowleft" size={24} color="#432344" />
          </TouchableOpacity>
        ),
      })}
    />
    <InsideStack.Screen
      name="TeamScoresScreen"
      component={TeamScoresScreen}
      options={({ navigation }) => ({
        headerShown: true,
        headerTitle: "Team Scores",
        headerTitleAlign: "center",
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginLeft: 15 }}
          >
            <AntDesign name="arrowleft" size={24} color="#432344" />
          </TouchableOpacity>
        ),
      })}
    />
  </InsideStack.Navigator>
);

const AdminInsideStackNavigator = () => (
  <InsideStack.Navigator>
    <InsideStack.Screen
      name="AdminDrawer"
      component={DrawerNavigator}
      options={{ headerShown: false }}
    />
    <InsideStack.Screen name="HomeAdmin" component={HomeScreenAdmin} />
    <InsideStack.Screen name="ProfileAdmin" component={ProfileAdmin} />
    <InsideStack.Screen name="AllLeaderboard" component={AllLeaderboard} />
    <InsideStack.Screen name="Category" component={CategoryScreen} />
    <InsideStack.Screen name="Judges" component={AllJudgesScreen} />
    <InsideStack.Screen name="TeamScores" component={TeamScoresScreen} />
    <InsideStack.Screen name="OverallScores" component={OverallScoresScreen} />
    <InsideStack.Screen name="EventCategory" component={EventCategories} />
    <InsideStack.Screen name="Event" component={EventsScreen} />
    <InsideStack.Screen name="EventLeaderboard" component={EventLeaderboard} />
    <InsideStack.Screen name="EventScores" component={EventScores} />
  </InsideStack.Navigator>
);

export default function App() {
  const navigationRef = useNavigationContainerRef();

  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, async (user) => {
      console.log("Auth state changed:", user);
      setUser(user);

      if (user) {
        // Check admin-users first
        const adminDoc = doc(FIREBASE_DB, "admin-users", user.uid);
        const adminSnapshot = await getDoc(adminDoc);

        if (adminSnapshot.exists()) {
          const userData = adminSnapshot.data();
          setRole(userData.role); // should be "admin"
          setLoading(false);
          return;
        }

        // If not admin, check judge-users
        const judgeDoc = doc(FIREBASE_DB, "judge-users", user.uid);
        const judgeSnapshot = await getDoc(judgeDoc);

        if (judgeSnapshot.exists()) {
          const userData = judgeSnapshot.data();
          setRole(userData.role); // should be "judge"
        } else {
          setRole(null);
          console.error(
            "User document does not exist in admin-users or judge-users!"
          );
        }
      } else {
        setRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && user && role && navigationRef.isReady()) {
      if (role === "admin") {
        navigationRef.reset({
          index: 0,
          routes: [{ name: "AdminScreen" }],
        });
      } else if (role === "judge") {
        navigationRef.reset({
          index: 0,
          routes: [{ name: "JudgeScreen" }],
        });
      }
    }
  }, [user, role, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#852B88" />
      </View>
    );
  }

  // Decide which screen to show first
  let initialRouteName = "LoginJudge";
  if (user) {
    if (role === "admin") initialRouteName = "AdminScreen";
    else if (role === "judge") initialRouteName = "JudgeScreen";
  }

  return (
    <LogoutModalProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar translucent={true} barStyle="light-content" />
        <Stack.Navigator
          screenOptions={{ headerShown: false }}
          initialRouteName={initialRouteName}
        >
          {/* Always register all screens */}
          <Stack.Screen name="LoginJudge" component={LoginJudge} />
          <Stack.Screen
            name="JudgeScreen"
            component={JudgeInsideStackNavigator}
          />
          <Stack.Screen name="LoginAdmin" component={Login} />
          <Stack.Screen name="SignUp" component={SignUp} />
          <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          <Stack.Screen
            name="AdminScreen"
            component={AdminInsideStackNavigator}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </LogoutModalProvider>
  );
}
