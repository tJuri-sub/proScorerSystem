import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import styles from "../components/styles/AuthformStyle";

//Utils
import bcrypt from "bcryptjs";

//Firbase Configurations
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { FIREBASE_APP, FIREBASE_AUTH, FIREBASE_DB } from "../firebaseconfig";

//Components
import Login from "./LoginScreenAdmin";
import VerifyEmailScreen from "./accountManage/VerifyEmailScreen";

const SignUp = () => {
  const [userData, setUserData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const auth = FIREBASE_AUTH;

  type RootStackParamList = {
    LoginAdmin: undefined;
    VerifyEmail: undefined;
  };

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleUserInput = (name: string, value: string) => {
    setUserData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const signIn = () => {
    navigation.navigate("LoginAdmin");
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkEmailDuplication = async (email: string) => {
    try {
      const methods = await fetchSignInMethodsForEmail(FIREBASE_AUTH, email);
      return methods.length > 0;
    } catch (error) {
      console.log("Error checking email duplication:", error);
      return false;
    }
  };

  // Password Validation Functions
  const isAtLeast8Characters = (password: string) => {
    return password.length >= 8;
  };

  const hasUppercase = (password: string) => {
    return /[A-Z]/.test(password);
  };

  const hasLowercase = (password: string) => {
    return /[a-z]/.test(password);
  };

  const hasNumber = (password: string) => {
    return /\d/.test(password);
  };

  const hasSpecialCharacter = (password: string) => {
    return /[@$!%*?&]/.test(password);
  };

  const validatePassword = (password: string) => {
    if (!isAtLeast8Characters(password)) {
      alert("Password must be at least 8 characters long.");
      return false;
    }
    if (!hasUppercase(password)) {
      alert("Password must include at least one uppercase letter.");
      return false;
    }
    if (!hasLowercase(password)) {
      alert("Password must include at least one lowercase letter.");
      return false;
    }
    if (!hasNumber(password)) {
      alert("Password must include at least one number.");
      return false;
    }
    if (!hasSpecialCharacter(password)) {
      alert("Password must include at least one special character (@$!%*?&).");
      return false;
    }
    return true;
  };

  const checkPasswordUniqueness = async (email: string, password: string) => {
    try {
      const userDocRef = doc(FIREBASE_DB, "admin-users", email); // Reference to the user's document
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const { previousPasswords } = userDoc.data();
        for (const hashedPassword of previousPasswords) {
          if (bcrypt.compareSync(password, hashedPassword)) {
            return false; // Password is not unique
          }
        }
      }
      return true; // Password is unique
    } catch (error) {
      console.log("Error checking password uniqueness:", error);
      return false;
    }
  };

  const storePassword = async (email: string, password: string) => {
    try {
      const userDocRef = doc(FIREBASE_DB, "admin-users", email);
      const userDoc = await getDoc(userDocRef);

      const hashedPassword = bcrypt.hashSync(password, 10); // Hash the password

      if (userDoc.exists()) {
        const { previousPasswords } = userDoc.data();
        // Update the list of previous passwords
        await updateDoc(userDocRef, {
          previousPasswords: [...(previousPasswords || []), hashedPassword],
        });
      } else {
        // Create a new document for the user
        await setDoc(userDocRef, {
          email,
          previousPasswords: [hashedPassword],
        });
      }
    } catch (error) {
      console.log("Error storing password:", error);
    }
  };

  // Sign Up Function
  const signUp = async () => {
    const { email, password, confirmPassword } = userData;
    // Email validation
    if (!email.trim()) {
      alert("Email cannot be empty!");
      return;
    }
    if (!validateEmail(email)) {
      alert("Invalid email format!");
      return;
    }
    if (await checkEmailDuplication(email)) {
      alert("Email is already in use!");
      return;
    }
    // Password validation
    if (!password.trim()) {
      alert("Password cannot be empty!");
      return;
    }
    if (!validatePassword(password)) {
      return;
    }
    if (!(await checkPasswordUniqueness(email, password))) {
      alert(
        "Password has been used before! Please choose a different password."
      );
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      const response = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log(response);

      await setDoc(doc(FIREBASE_DB, "admin-users", response.user.uid), {
        role: "admin",
        email: response.user.email,
      });

      // Store the new password in the database
      await storePassword(email, password);

      // Send email verification
      if (response.user) {
        await sendEmailVerification(response.user);
        alert(
          "Account created successfully! A verification email has been sent to your email address."
        );
      }

      // Navigate to VerifyEmailScreen
      navigation.navigate("VerifyEmail");
    } catch (error: any) {
      console.log(error);
      alert("Sign in failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topLeftBlob} />
      <View style={styles.bottomRightBlob} />

      <View style={styles.widthForm}>
        <View style={styles.innerContainer}>
          <View style={styles.titleBox}>
            <Text style={styles.title}>
              Create <Text style={styles.highlight}>Admin Account</Text>
            </Text>
            <Text style={styles.subtitle}>
              Fill in the information below to create and register your admin
              account.
            </Text>
          </View>
          <View style={styles.spacing}>
            <View style={styles.containerForm}>
              {/* Email */}
              <TextInput
                style={styles.input}
                value={userData.email}
                placeholder="Email"
                placeholderTextColor={"#999999"}
                autoCapitalize="none"
                onChangeText={(text) => handleUserInput("email", text)}
              />
              {/* Password */}

              <View style={{ position: "relative", width: "100%" }}>
                <TextInput
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  value={userData.password}
                  placeholder="Password"
                  placeholderTextColor={"#999999"}
                  autoCapitalize="none"
                  onChangeText={(text) => handleUserInput("password", text)}
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
              {/* Confirm Password */}
              <View style={{ position: "relative", width: "100%" }}>
                <TextInput
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  value={userData.confirmPassword}
                  placeholder="Confirm Password"
                  placeholderTextColor={"#999999"}
                  autoCapitalize="none"
                  onChangeText={(text) =>
                    handleUserInput("confirmPassword", text)
                  }
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
            </View>
          </View>
          {/* Create User Button */}

          <TouchableOpacity style={styles.signButton} onPress={signUp}>
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Sign up</Text>
            )}
          </TouchableOpacity>

          {/* Login In Link */}
          <View style={styles.signUpbuttonContainer}>
            <Text style={{ fontSize: 16 }}>Already have an account? </Text>
            <TouchableOpacity onPress={signIn}>
              <Text style={styles.textlink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

export default SignUp;
