import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ReactNode }>,
  State
> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message ?? 'Lỗi không xác định' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, message: '' });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <View style={s.container}>
          <AlertTriangle color="#ef4444" size={40} />
          <Text style={s.title}>Có lỗi xảy ra</Text>
          <Text style={s.message}>{this.state.message}</Text>
          <TouchableOpacity style={s.btn} onPress={this.reset}>
            <Text style={s.btnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#030712',
    justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12,
  },
  title: { color: '#f9fafb', fontSize: 18, fontWeight: '700' },
  message: { color: '#9ca3af', fontSize: 14, textAlign: 'center' },
  btn: {
    marginTop: 8, backgroundColor: '#1f2937', borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: '#374151',
  },
  btnText: { color: '#38bdf8', fontSize: 15, fontWeight: '600' },
});
