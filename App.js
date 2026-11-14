import React, { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, Platform, SafeAreaView, StyleSheet, View, ActivityIndicator, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";

const APP_URL = "https://sisandashange.github.io/bouncy01/";

export default function App() {
  const web = useRef(null);
  const canGoBack = useRef(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const onBackPress = useCallback(() => {
    if (canGoBack.current && web.current) {
      web.current.goBack();
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [onBackPress]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" backgroundColor="#0f1318" />
      <WebView
        ref={web}
        source={{ uri: APP_URL }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically={false}
        pullToRefreshEnabled
        originWhitelist={["https://*"]}
        onNavigationStateChange={(state) => { canGoBack.current = state.canGoBack; }}
        onLoadStart={() => { setLoading(true); setFailed(false); }}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setLoading(false); setFailed(true); }}
        onHttpError={(event) => {
          if (event.nativeEvent.statusCode >= 500) setFailed(true);
        }}
        allowsBackForwardNavigationGestures
      />
      {loading && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#ff2d87" />
          <Text style={styles.loading}>Opening BOUNCY…</Text>
        </View>
      )}
      {failed && !loading && (
        <View style={styles.error} pointerEvents="none">
          <Text style={styles.errorText}>Connection problem. Pull down to try again.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f1318" },
  web: { flex: 1, backgroundColor: "#0f1318" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0f1318", alignItems: "center", justifyContent: "center" },
  loading: { color: "#f2f5f8", marginTop: 12, fontSize: 14 },
  error: { position: "absolute", bottom: 20, alignSelf: "center", backgroundColor: "#262e38", padding: 12, borderRadius: 10 },
  errorText: { color: "#f2f5f8", fontSize: 13 }
});
