import { View, Text, StyleSheet } from 'react-native';
export default function DashboardScreen() {
  return <View style={s.c}><Text style={s.t}>Dashboard — Phase 5</Text></View>;
}
const s = StyleSheet.create({ c: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#030712' }, t: { color: '#e5e7eb', fontSize: 18 } });
