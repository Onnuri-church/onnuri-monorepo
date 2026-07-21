import { StyleSheet, Text, View } from "react-native";

export default function SermonScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>주간 말씀 영상</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "600" },
});
