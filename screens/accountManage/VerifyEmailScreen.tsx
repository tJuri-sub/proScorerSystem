// import React, { useState, useRef, useEffect } from "react";
// import { View, Text, Button, StyleSheet, Alert } from "react-native";
// import { FIREBASE_AUTH } from "../../firebaseconfig";
// import { sendEmailVerification } from "firebase/auth";

// const COOLDOWN_SECONDS = 60; // or 300 for 5 mins

// const VerifyEmail = ({ navigation }: any) => {
//   const [cooldown, setCooldown] = useState(0);
//   const [verified, setVerified] = useState(false);
//   const timerRef = useRef<NodeJS.Timeout | null>(null);
//   const pollRef = useRef<NodeJS.Timeout | null>(null);

//   // Cooldown timer for resend button
//   useEffect(() => {
//     if (cooldown > 0) {
//       timerRef.current = setInterval(() => {
//         setCooldown((prev) => {
//           if (prev <= 1 && timerRef.current) {
//             clearInterval(timerRef.current);
//             timerRef.current = null;
//           }
//           return prev - 1;
//         });
//       }, 1000);
//     }
//     return () => {
//       if (timerRef.current) clearInterval(timerRef.current);
//     };
//   }, [cooldown]);

//   // Poll for email verification status every 3 seconds
//   useEffect(() => {
//     pollRef.current = setInterval(async () => {
//       const user = FIREBASE_AUTH.currentUser;
//       if (user) {
//         await user.reload();
//         if (user.emailVerified) {
//           setVerified(true);
//           clearInterval(pollRef.current!);
//           Alert.alert(
//             "Account Verified",
//             "Your account has been verified! You can now log in.",
//             [
//               {
//                 text: "Proceed to Login",
//                 onPress: () =>
//                   navigation.reset({
//                     index: 0,
//                     routes: [{ name: "LoginAdmin" }],
//                   }),
//               },
//             ]
//           );
//         }
//       }
//     }, 3000); // Poll every 3 seconds

//     return () => {
//       if (pollRef.current) clearInterval(pollRef.current);
//     };
//   }, []);
//   const handleResendEmail = async () => {
//     if (cooldown > 0) {
//       Alert.alert(
//         "Please wait",
//         `You can resend the email in ${cooldown} seconds.`
//       );
//       return;
//     }
//     try {
//       const user = FIREBASE_AUTH.currentUser;
//       if (user) {
//         await sendEmailVerification(user);
//         Alert.alert("Success", "Verification email resent!");
//         setCooldown(COOLDOWN_SECONDS);
//       } else {
//         Alert.alert("Error", "No user is currently signed in.");
//       }
//     } catch (error: any) {
//       if (error.code === "auth/too-many-requests") {
//         Alert.alert(
//           "Too Many Requests",
//           "You have requested verification emails too frequently. Please wait before trying again."
//         );
//         setCooldown(COOLDOWN_SECONDS);
//       } else {
//         console.error("Error resending verification email:", error);
//         Alert.alert("Error", "Failed to resend verification email.");
//       }
//     }
//   };

//   const user = FIREBASE_AUTH.currentUser;
//   const email = user?.email;

//   return (
//     <View style={styles.container}>
//       <Text style={styles.text}>
//         A verification email has been sent to your email address. Please verify
//         your email to continue.
//       </Text>
//       <Text style={styles.email}>{email || "No email found"}</Text>
//       <Button
//         title={cooldown > 0 ? `Resend Email (${cooldown}s)` : "Resend Email"}
//         onPress={handleResendEmail}
//         disabled={cooldown > 0}
//       />
//       {/* Optionally, keep the manual check button for fallback */}
//       {/* <Button title="Check Verification" onPress={handleCheckVerification} /> */}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 20,
//   },
//   text: {
//     fontSize: 16,
//     textAlign: "center",
//     marginBottom: 20,
//   },
//   email: {
//     fontSize: 16,
//     fontWeight: "bold",
//     marginBottom: 20,
//     color: "#333",
//   },
// });

// export default VerifyEmail;

import React, { useState, useRef, useEffect } from "react";
import { View, Text, Button, StyleSheet, Alert } from "react-native";
import { FIREBASE_AUTH } from "../../firebaseconfig";
import { sendEmailVerification } from "firebase/auth";
import { useFocusEffect } from "@react-navigation/native"; // <-- Add this import

const COOLDOWN_SECONDS = 60; // or 300 for 5 mins

const VerifyEmail = ({ navigation }: any) => {
  const [cooldown, setCooldown] = useState(0);
  const [verified, setVerified] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Cooldown timer for resend button
  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1 && timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldown]);

  // Poll for email verification status every 3 seconds
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      const user = FIREBASE_AUTH.currentUser;
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          setVerified(true);
          clearInterval(pollRef.current!);
          Alert.alert(
            "Account Verified",
            "Your account has been verified! You can now log in.",
            [
              {
                text: "Proceed to Login",
                onPress: () =>
                  navigation.reset({
                    index: 0,
                    routes: [{ name: "LoginAdmin" }],
                  }),
              },
            ]
          );
        }
      }
    }, 3000); // Poll every 3 seconds

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Check verification on screen focus (for when user returns from Gmail)
  useFocusEffect(
    React.useCallback(() => {
      const checkVerification = async () => {
        const user = FIREBASE_AUTH.currentUser;
        if (user) {
          await user.reload();
          if (user.emailVerified) {
            setVerified(true);
            Alert.alert(
              "Account Verified",
              "Your account has been verified! You can now log in.",
              [
                {
                  text: "Proceed to Login",
                  onPress: () =>
                    navigation.reset({
                      index: 0,
                      routes: [{ name: "LoginAdmin" }],
                    }),
                },
              ]
            );
          }
        }
      };
      checkVerification();
    }, [navigation])
  );

  const handleResendEmail = async () => {
    if (cooldown > 0) {
      Alert.alert(
        "Please wait",
        `You can resend the email in ${cooldown} seconds.`
      );
      return;
    }
    try {
      const user = FIREBASE_AUTH.currentUser;
      if (user) {
        await sendEmailVerification(user);
        Alert.alert("Success", "Verification email resent!");
        setCooldown(COOLDOWN_SECONDS);
      } else {
        Alert.alert("Error", "No user is currently signed in.");
      }
    } catch (error: any) {
      if (error.code === "auth/too-many-requests") {
        Alert.alert(
          "Too Many Requests",
          "You have requested verification emails too frequently. Please wait before trying again."
        );
        setCooldown(COOLDOWN_SECONDS);
      } else {
        console.error("Error resending verification email:", error);
        Alert.alert("Error", "Failed to resend verification email.");
      }
    }
  };

  const user = FIREBASE_AUTH.currentUser;
  const email = user?.email;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        A verification email has been sent to your email address. Please verify
        your email to continue.
      </Text>
      <Text style={styles.email}>{email || "No email found"}</Text>
      <Button
        title={cooldown > 0 ? `Resend Email (${cooldown}s)` : "Resend Email"}
        onPress={handleResendEmail}
        disabled={cooldown > 0}
      />
      <View style={{ height: 20 }} />
      <Button
        title="Go to Login"
        onPress={() =>
          navigation.reset({
            index: 0,
            routes: [{ name: "LoginAdmin" }],
          })
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  text: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  email: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
});

export default VerifyEmail;
