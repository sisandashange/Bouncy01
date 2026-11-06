import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from './src/supabase';
import { c } from './src/theme';
import Auth from './src/screens/Auth';
import ChatList from './src/screens/ChatList';
import Chat from './src/screens/Chat';

export default function App() {
  const [session, setSession] = useState(undefined);
  const [chat, setChat] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) setChat(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const h = BackHandler.addEventListener('hardwareBackPress', () => {
      if (chat) { setChat(null); return true; }
      return false;
    });
    return () => h.remove();
  }, [chat]);

  const me = session?.user;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1, backgroundColor: c.ink }}>
        {session === undefined ? (
          <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={c.sun} /></View>
        ) : !me ? (
          <Auth />
        ) : chat ? (
          <Chat me={me} chat={chat} onBack={() => setChat(null)} />
        ) : (
          <ChatList me={me} onOpen={setChat} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
