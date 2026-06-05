import { View, Text, StyleSheet } from 'react-native';
export default function ProductsScreen() {
  return <View style={s.c}><Text style={s.t}>Products — Phase 6</Text></View>;
}
const s = StyleSheet.create({ c: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#030712' }, t: { color: '#e5e7eb', fontSize: 18 } });
