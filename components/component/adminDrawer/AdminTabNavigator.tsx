import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreenAdmin from "../../../screens/admin/HomeScreen";
import OverallScoresScreen from "../../../screens/admin/OverallScores";
import AllLeaderboard from "../../../screens/admin/Leaderboard";

import Entypo from "@expo/vector-icons/Entypo";
import { FontAwesome, FontAwesome6, MaterialIcons } from "@expo/vector-icons";
import AllJudgesScreen from "../../../screens/admin/AllJudgesScreen";
import { EventsManager } from "../../../screens/admin/EventsManager";

const Tab = createBottomTabNavigator();

export default function AdminTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 60,
          paddingVertical: 5,
        },
        tabBarActiveTintColor: "#432344",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreenAdmin}
        options={{
          headerShown: true,
          headerTitle: "Home Admin",
          headerTitleAlign: "center",
          tabBarIcon: ({ color, size }) => (
            <Entypo name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="OverallScores"
        component={OverallScoresScreen}
        options={{
          headerShown: true,
          headerTitle: "Scores",
          headerTitleAlign: "center",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="table" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Events"
        component={EventsManager}
        options={{
          headerShown: true,
          headerTitle: "Events",
          headerTitleAlign: "center",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="event" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Ranks"
        component={AllLeaderboard}
        options={{
          headerShown: true,
          headerTitle: "Leaderboard",
          headerTitleAlign: "center",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="ranking-star" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Judges"
        component={AllJudgesScreen}
        options={{
          headerShown: true,
          headerTitle: "Judges",
          headerTitleAlign: "center",
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="users" size={size} color={color} />
          ),
        }}
      />

      {/* <AdminTab.Screen name="Logs" component={LogsAdmin} /> */}
    </Tab.Navigator>
  );
}
