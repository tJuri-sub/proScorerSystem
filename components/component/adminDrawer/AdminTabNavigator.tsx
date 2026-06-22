import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreenAdmin from "../../../pages/admin/HomeScreen";
import OverallScoresScreen from "../../../pages/admin/OverallScores";
import AllLeaderboard from "../../../pages/admin/Leaderboard";

import Entypo from "@expo/vector-icons/Entypo";
import { FontAwesome, FontAwesome6, MaterialIcons } from "@expo/vector-icons";
import AllJudgesScreen from "../../../pages/admin/AllJudgesScreen";
import { EventsManager } from "../../../pages/admin/EventsManager";

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
          headerTitle: "Home",
          headerTitleAlign: "center",
          tabBarIcon: ({ color, size }) => (
            <Entypo name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Scores"
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
