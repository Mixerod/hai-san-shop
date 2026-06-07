import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorView({ message = 'Không thể tải dữ liệu', onRetry }: Props) {
  return (
    <View style={s.container}>
      <WifiOff color="#374151" size={48} />
      <Text style={s.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={s.retryBtn} onPress={onRetry}>
          <Text style={s.retryText}>Thử lại</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#030712', gap: 16, padding: 32,
  },
  message: { color: '#6b7280', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    backgroundColor: '#1f2937', borderRadius: 10, borderWidth: 1,
    borderColor: '#374151', paddingHorizontal: 24, paddingVertical: 10,
  },
  retryText: { color: '#38bdf8', fontSize: 15, fontWeight: '600' },
});
