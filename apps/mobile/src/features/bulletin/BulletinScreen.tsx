import { StyleSheet, Text, View } from "react-native";

export default function BulletinScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>주보</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "600" },
});
