// styles/AppStyles.ts
import { StyleSheet } from 'react-native';

const AppStyles = StyleSheet.create({
  // Global/Base Styles for App Container and Loading State
  appContainer: {
    flex: 1,
    flexDirection: "column",
    height: "100%", // Retain for web compatibility
    fontFamily: "sans-serif", // Retain for web compatibility
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0E0F1D',
  },
  loadingText: {
    color: '#E0E0E0',
    marginTop: 10,
  },

  // Styles for IndexScreen (main quote display)
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5", // Light background for main screen
    flexDirection: "column",
    height: "100%", // Retain for web compatibility
  },
  header: {
    padding: 20,
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    // fontFamily: "Montserrat", // RN uses native fonts, this might not work as expected without custom font setup
    fontSize: 34,
    fontWeight: "900" as "900",
    color: "#333333",
    letterSpacing: 1,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#666666",
    fontWeight: "500" as "500",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 250,
    flexDirection: "column",
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 250,
    flexDirection: "column",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6a0dad",
  },
  categoryBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  categoryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold" as "bold",
    textTransform: "uppercase",
    margin: 0,
  },
  quote: {
    fontSize: 26,
    lineHeight: 26 * 1.6,
    color: "#333333",
    fontStyle: "italic",
    marginBottom: 20,
    margin: 0,
    fontWeight: "bold" as "bold",
  },
  author: {
    fontSize: 15,
    color: "#666666",
    textAlign: "right",
    fontWeight: "normal" as "normal",
    alignSelf: "flex-end",
    margin: 0,
    marginTop: 10,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingVertical: 10,
    paddingBottom: 20,
  },
  navButton: {
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: "#4b4b4b",
  },

  // Styles for TopicsScreen (dark mode)
  topicsContainer: {
    flex: 1,
    backgroundColor: "#0E0F1D", // Dark background
    flexDirection: "column",
    height: "100%", // Retain for web compatibility
  },
  topicsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  backButton: {
    marginRight: 16,
    backgroundColor: "transparent",
    color: "#FFFFFF",
  },
  topicsTitle: {
    fontSize: 24,
    fontWeight: "bold" as "bold",
    color: "#FFFFFF",
    margin: 0,
  },
  topicsList: {
    paddingHorizontal: 10,
    paddingVertical: 20,
    flex: 1,
  },
  topicCard: {
    backgroundColor: "#222034",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  topicText: {
    fontSize: 16,
    fontWeight: "600" as "600",
    color: "#E0E0E0",
    margin: 0,
    marginLeft: 10,
  },

  // Styles for SettingsScreen (dark mode)
  settingsContainer: {
    flex: 1,
    backgroundColor: "#0E0F1D", // Dark background
    flexDirection: "column",
    height: "100%", // Retain for web compatibility
  },
  scrollView: {
    flex: 1,
    padding: 10,
  },
  settingCard: {
    backgroundColor: "#222034",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
    flexDirection: "column",
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600" as "600",
    color: "#E0E0E0",
    margin: 0,
  },
  saveButton: {
    backgroundColor: "#6672E7",
    marginHorizontal: 20,
    marginVertical: 20,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold" as "bold",
    margin: 0,
  },
  switch: {
    width: 44, // Adjusted from 40 for better touch target based on common Switch sizes
    height: 24, // Adjusted from 20
    borderRadius: 12,
    padding: 2,
  },
  switchThumb: {
    width: 20, // Adjusted from 16
    height: 20, // Adjusted from 16
    borderRadius: 10, // Adjusted from 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600" as "600",
    color: "#E0E0E0",
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  optionButton: {
    backgroundColor: "#4D637D",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 15,
    paddingRight: 15,
    borderRadius: 10,
    minWidth: 40,
    alignItems: "center",
  },
  selectedOption: { backgroundColor: "#6672E7" },
  optionText: {
    fontSize: 14,
    fontWeight: "600" as "600",
    color: "#B0B0B0",
  },
  selectedOptionText: {
    color: "#FFFFFF",
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  dayButton: {
    backgroundColor: "#4D637D",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 10,
    marginBottom: 6,
    minWidth: 40,
    alignItems: "center",
  },
  selectedDay: { backgroundColor: "#6672E7" },
  dayText: { fontSize: 12, fontWeight: "600" as "600", color: "#B0B0B0" },
  selectedDayText: { color: "#FFFFFF" },
  logoutButton: {
    backgroundColor: '#E63946',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold' as "bold",
    margin: 0,
  },
});

export default AppStyles;
