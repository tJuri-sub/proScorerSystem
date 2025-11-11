import { StyleSheet } from "react-native";

export default StyleSheet.create({
  modalmenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    paddingTop: 60,
    paddingLeft: 20,
  },

  dropdownContent: {
    position: "absolute",
    top: 62,
    left: 20,
    backgroundColor: "#fff",
    borderRadius: 4,
    boxShadow: "0px 2px 3px rgba(0,0,0,0.4)",
  },

  dropdownItem: {
    paddingVertical: 6,
    paddingHorizontal: 25,
    backgroundColor: "#f3f3f3",
  },

  dropdownItemPressed: {
    backgroundColor: "#EDEDED",
  },

  dropdownText: {
    fontSize: 16,
    color: "#432344",
    textAlign: "center",
  },

  safeArea: {
    flex: 1,
    margin: 10,
    padding: 10,
  },

  cardContainer: {
    width: "100%",
  },

  header: {
    flexDirection: "column",
    marginBottom: 20,
  },

  profileCard: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "rgb(150, 150, 150)",
    paddingBottom: 10,
    marginBottom: 5,
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 40,
    marginRight: 15,
    backgroundColor: "#eee",
    borderWidth: 1,
  },

  nameContainer: {
    justifyContent: "center",
    gap: 5,
  },

  greeting: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    fontFamily: "Inter_400Regular",
  },

  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#852B88",
    fontFamily: "Inter_400Regular",
  },

  categoryAssigned: {
    fontSize: 16,
    color: "#852B88",
    fontWeight: "bold",
    fontFamily: "Inter_400Regular",
  },

  container: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 15,
  },

  categoryContainer: {
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 10,
    width: "100%",
    justifyContent: "center",
    color: "#432344",
  },

  categorytitleText: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "Inter_400Regular",
    color: "#432344",
    marginBottom: 10,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  card: {
    height: 130,
    borderRadius: 10,
    display: "flex",
    flexDirection: "row",
    marginBottom: 16,
    overflow: "hidden",
    boxShadow: "0px 2px 3px rgba(0,0,0,0.3)",
  },

  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },

  cardHeader: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1, // Ensure the icon is above other elements
  },

  cardOptionsIcon: {
    padding: 5,
    borderRadius: 15, // Rounded icon background
  },

  sideImage: {
    height: "100%",
    aspectRatio: 1 / 1,
    borderRadius: 10,
  },

  ContainerCategory: {
    flex: 1,
    padding: 10,
    marginLeft: 5,
    marginRight: 15,
    marginTop: 5,
    flexWrap: "wrap",
    flexShrink: 1,
  },

  cardTextThin: {
    fontSize: 20,
    color: "#ffffff",
    textTransform: "uppercase",
    fontWeight: "ultralight",
    letterSpacing: 3,
    fontFamily: "Inter_400Regular",
  },

  cardText: {
    fontSize: 20,
    color: "#ffffff",
    textTransform: "uppercase",
    fontWeight: "bold",
    letterSpacing: 3,
    fontFamily: "Inter_400Regular",
  },

  cardDesc: {
    marginTop: 2,
    fontSize: 14,
    color: "#ffffff",
    fontFamily: "inter_400Regular",
    flexWrap: "wrap",
  },

  modalOverlayCat: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContentCat: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: 300,
    alignItems: "center",
    boxShadow: "0px 3px 4px rgba(0,0,0,0.3)",
  },

  modalCloseIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1, // Ensure the close icon is above other elements
  },

  modalTitleCat: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#432344",
    marginBottom: 20,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "inter_400Regular",
  },

  modalButtonCat: {
    backgroundColor: "#E79300",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginVertical: 5,
    alignItems: "center",
    width: "100%",
    boxShadow: "0px 2px 3px rgba(0,0,0,0.3)",
  },

  modalButtonTextCat: {
    fontSize: 16,
    color: "#fff", // White text for contrast
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
