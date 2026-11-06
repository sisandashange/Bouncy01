import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../supabase';
import { c } from '../theme';

export default function Auth() {
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const go = async () => {
    setBusy(true); setMsg('');
    const creds = { email: email.trim(), password: pw };
    const { data, error } = signup
      ? await supabase.auth.signUp(creds)
      : await supabase.auth.signInWithPassword(creds);
    if (error) setMsg(error.message);
    else if (signup && !data.session) setMsg('Check your email to confirm your account, then log in.');
    setBusy(false);
  };

  return (
    <View style={st.wrap}>
      <Text style={st.logo}>Bouncy</Text>
      <Text style={st.tag}>Message anyone, instantly.</Text>
      <TextInput style={st.input} placeholder="Email" placeholderTextColor={c.muted} autoCapitalize="none"
        keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={st.input} placeholder="Password (6+ characters)" placeholderTextColor={c.muted} secureTextEntry
        value={pw} onChangeText={setPw} />
      {!!msg && <Text style={st.msg}>{msg}</Text>}
      <Pressable style={st.btn} onPress={go} disabled={busy || !email || pw.length < 6}>
        {busy ? <ActivityIndicator color={c.ink} /> : <Text style={st.btnT}>{signup ? 'Create account' : 'Log in'}</Text>}
      </Pressable>
      <Pressable onPress={() => { setSignup(!signup); setMsg(''); }}>
        <Text style={st.link}>{signup ? 'Have an account? Log in' : 'New here? Create an account'}</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 28, gap: 14 },
  logo: { color: c.text, fontSize: 56, fontWeight: '900', letterSpacing: -2 },
  tag: { color: c.sun, fontSize: 18, fontWeight: '600', marginBottom: 18 },
  input: { backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 16, color: c.text, fontSize: 16, padding: 16 },
  msg: { color: c.danger, fontSize: 14 },
  btn: { backgroundColor: c.sun, borderRadius: 16, padding: 17, alignItems: 'center', marginTop: 4 },
  btnT: { color: c.ink, fontSize: 17, fontWeight: '800' },
  link: { color: c.muted, textAlign: 'center', marginTop: 10, fontSize: 15 },
});
