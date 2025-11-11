import {
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import React, { useState } from "react";
import { FIREBASE_AUTH, FIREBASE_DB } from "../firebaseconfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import styles from "../components/styles/AuthformStyle";
import Login from "./LoginScreenAdmin";
import { Inter_400Regular, useFonts } from "@expo-google-fonts/inter";

type RootStackParamList = {
  SignUp: undefined;
  JudgeScreen: undefined;
  LoginAdmin: undefined;
};

const LoginJudge = () => {
  let [fontsLoaded] = useFonts({
    Inter_400Regular,
  });

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");

  const auth = FIREBASE_AUTH;

  const signIn = async () => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        FIREBASE_AUTH,
        email,
        password
      );
      const user = userCredential.user;

      // Query judge-users collection for a document with matching email
      const q = query(
        collection(FIREBASE_DB, "judge-users"),
        where("email", "==", user.email)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        if (userData.role === "judge") {
          if (userData.disabled) {
            // Account is disabled
            await FIREBASE_AUTH.signOut();
            setErrorMsg("Your account is disabled, please contact admin.");
            setLoading(false);
            return;
          }
          // Proceed to judge home screen
          navigation.navigate("JudgeScreen");
        } else {
          // Not a judge, sign out and show error
          await FIREBASE_AUTH.signOut();
          setErrorMsg("Access denied: Only judges can log in here.");
        }
      } else {
        // User doc not found
        await FIREBASE_AUTH.signOut();
        setErrorMsg("Access denied: Only judges can log in here.");
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMsg("Login failed: " + error.message);
      } else {
        setErrorMsg("Login failed: An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const loginAdmin = () => {
    console.log("Navigating to SignUpScreenAdmin"); // Debugging line
    navigation.navigate("LoginAdmin"); // Ensure this matches the route name in App.tsx
  };

  return (
    <View style={styles.container}>
      <View style={styles.topLeftBlob} />
      <View style={styles.bottomRightBlob} />

      <View style={styles.widthForm}>
        <View style={styles.innerContainer}>
          <View style={styles.titleBox}>
            <Text style={styles.headtitle}>Hello</Text>
            <Text style={styles.title}>
              Login your <Text style={styles.highlight}>Judge Account</Text>
            </Text>
            <Text style={styles.subtitle}>
              Sign in with your account details.
            </Text>
          </View>

          <View style={styles.spacing}>
            <View style={styles.containerForm}>
              {/* Email */}
              <TextInput
                style={styles.input}
                value={email}
                placeholder="ex. judge_johndoe@felta.org"
                placeholderTextColor={"#999999"}
                autoCapitalize="none"
                onChangeText={(text) => {
                  setEmail(text);
                  setErrorMsg("");
                }}
              />

              {/* Password */}
              <View style={{ position: "relative", width: "100%" }}>
                <TextInput
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  value={password}
                  placeholder="Password"
                  placeholderTextColor={"#999999"}
                  autoCapitalize="none"
                  onChangeText={(text) => {
                    setPassword(text);
                    setErrorMsg("");
                  }}
                />
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    right: 20,
                    top: 0,
                    bottom: 0,
                    justifyContent: "center",
                    height: "100%",
                  }}
                  onPress={() => setShowPassword((prev) => !prev)}
                >
                  <FontAwesome5
                    name={showPassword ? "eye" : "eye-slash"}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>
              </View>

              {errorMsg !== "" && (
                <Text
                  style={{
                    color: "red",
                    marginTop: 8,
                    textAlign: "center",
                    fontFamily: "inter_400Regular",
                    fontSize: 12,
                  }}
                >
                  {errorMsg}
                </Text>
              )}
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity style={styles.signButton} onPress={signIn}>
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          {/* Navigate to Admin */}
          <View style={styles.signUpbuttonContainer}>
            <TouchableOpacity onPress={loginAdmin} style={styles.backNav}>
              <Text style={styles.textlink}>Login as Admin</Text>
              <AntDesign name="arrowright" size={24} color="#852B88" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

export default LoginJudge;
