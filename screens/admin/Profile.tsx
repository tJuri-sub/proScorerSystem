import React, { useEffect, useState } from "react";
import {
  Text,
  StyleSheet,
  View,
  Button,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  Pressable,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import styles from "../../components/styles/adminStyles/Profilescreen";

import { FIREBASE_AUTH, FIREBASE_DB } from "../../firebaseconfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileAdmin({ navigation }: any) {
  const user = FIREBASE_AUTH.currentUser;
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState<string>("");
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setUserEmail(user.email);
        const userDoc = await getDoc(
          doc(FIREBASE_DB, "admin-users", user.email!)
        );
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsername(data.name || "");
          setAvatarUrl(
            data.avatarUrl ||
              `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
                user.email || "default"
              )}`
          );
        }
      }
    };
    fetchProfile();
  }, [user]);

  // Pick image from gallery or camera
  const pickAvatar = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarUrl(result.assets[0].uri);
      // Save to Firestore
      if (user) {
        await updateDoc(doc(FIREBASE_DB, "admin-users", user.email!), {
          avatarUrl: result.assets[0].uri,
        });
      }
    }
  };

  // Edit profile (username)
  const handleSaveProfile = async () => {
    if (!newUsername.trim()) {
      Alert.alert("Username cannot be empty.");
      return;
    }
    if (user) {
      await updateDoc(doc(FIREBASE_DB, "admin-users", user.email!), {
        name: newUsername,
      });
      setUsername(newUsername);
      setEditModalVisible(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri:
                  avatarUrl ||
                  `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
                    userEmail || "default"
                  )}`,
              }}
              style={styles.avatar}
            />
            {/* Edit Avatar Button */}
            <TouchableOpacity style={styles.editAvatarBtn} onPress={pickAvatar}>
              <Ionicons name="pencil" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.username}>{username}</Text>
          <View style={styles.emailPill}>
            <Text style={styles.emailText}>{userEmail}</Text>
          </View>

          {/* Profile Options */}
          <View style={styles.optionsCard}>
            {/* Edit Profile */}
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                setNewUsername(username);
                setEditModalVisible(true);
              }}
            >
              <Ionicons name="pencil-outline" size={20} color="#6c63ff" />
              <Text style={styles.optionText}>Edit Username</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="#888"
                style={{ marginLeft: "auto" }}
              />
            </TouchableOpacity>
            {/* Change Password */}
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => navigation.navigate("ChangePassword")}
            >
              <Ionicons name="lock-closed-outline" size={20} color="#6c63ff" />
              <Text style={styles.optionText}>Change Password</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="#888"
                style={{ marginLeft: "auto" }}
              />
            </TouchableOpacity>
            {/* Logout */}
            <TouchableOpacity
              style={[styles.optionRow, { borderBottomWidth: 0 }]}
              onPress={() => setLogoutModalVisible(true)}
            >
              <Ionicons name="log-out-outline" size={20} color="#d9534f" />
              <Text style={[styles.optionText, { color: "#d9534f" }]}>
                Logout
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="#d9534f"
                style={{ marginLeft: "auto" }}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Confirmation Modal */}
        <Modal
          visible={logoutModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLogoutModalVisible(false)}
        >
          <View style={styles.modalOverlayLogout}>
            <View style={styles.modalContentLogout}>
              <Text style={styles.modalTitle}>
                Are you sure you want to log out?
              </Text>
              <View style={styles.modalButtonContainer}>
                <Pressable
                  style={[styles.modalButton, styles.backButton]}
                  onPress={() => setLogoutModalVisible(false)}
                >
                  <Text style={[styles.modalButtonText, styles.backButtonText]}>
                    Back
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.yesButton]}
                  onPress={() => {
                    FIREBASE_AUTH.signOut();
                    navigation.replace("LoginAdmin");
                  }}
                >
                  <Text style={styles.modalButtonText}>Yes</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Profile Modal */}
        <Modal visible={editModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text
                style={{ fontWeight: "bold", fontSize: 18, marginBottom: 10 }}
              >
                Edit Profile
              </Text>
              <TextInput
                placeholder="Username"
                value={newUsername}
                onChangeText={setNewUsername}
                style={styles.input}
              />
              <View
                style={{ flexDirection: "row", justifyContent: "flex-end" }}
              >
                <Button
                  title="Cancel"
                  onPress={() => setEditModalVisible(false)}
                />
                <View style={{ width: 10 }} />
                <Button title="Save" onPress={handleSaveProfile} />
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
