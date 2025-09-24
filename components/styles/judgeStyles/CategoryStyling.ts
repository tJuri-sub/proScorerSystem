import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f3f3f3",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 5,
  },

  backButton: {
    marginRight: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderColor: "#432344",
    borderWidth: 1,
    borderRadius: 5,
  },

  backButtonText: {
    fontSize: 14,
    color: "#432344",
    fontWeight: "bold",
    letterSpacing: 0.5,
  },

  title: {
    flex: 1, // Center the title
    fontSize: 18,
    fontWeight: "bold",
    color: "#432344",
    textAlign: "center",
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  scoreCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
  },

  scoreText: { fontSize: 14, marginBottom: 2 },

  // TEAM CARD
  teamCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 20,
    marginVertical: 12,
    width: "95%",
    alignSelf: "center",
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },

  cardTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#d1d5db",
    paddingBottom: 6,
  },

  topBarText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  teamInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  teamName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#4c1d95", // deep purple accent
    flexShrink: 1,
    flexWrap: "wrap",
  },

  country: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
    marginLeft: 12,
  },

  membersBlock: {
    marginBottom: 10,
    marginLeft: 4,
  },

  member: {
    fontSize: 15,
    color: "#1f2937",
    marginBottom: 4,
  },

  coachRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  coachLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginRight: 6,
  },

  coachName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4c1d95",
  },

  footerNote: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "right",
  },
});
