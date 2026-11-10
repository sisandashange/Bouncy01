import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View, ActivityIndicator, PanResponder
} from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer, THREE } from 'expo-three';

global.THREE = global.THREE || THREE;
import { supabase } from './src/lib/supabase';

const PALETTE = [
  ['Bone', '#e9e2d6'], ['Ink', '#171717'], ['Crimson', '#b83e3a'],
  ['Cobalt', '#416b9c'], ['Olive', '#737b50'], ['Lilac', '#a99ac5'],
  ['Chocolate', '#684b3c'], ['White', '#f8f7f2']
];
const GARMENTS = ['T-shirt', 'Hoodie', 'Jacket', 'Dress', 'Pants'];

function makeGarment(category, color, materialName = 'Cotton fleece') {
  const shape = new THREE.Shape();
  if (category === 'Dress') {
    shape.moveTo(-0.25, 0.88); shape.lineTo(-0.68, 0.62);
    shape.lineTo(-0.48, 0.18); shape.lineTo(-0.34, 0.32);
    shape.lineTo(-0.62, -0.88); shape.lineTo(0.62, -0.88);
    shape.lineTo(0.34, 0.32); shape.lineTo(0.48, 0.18);
    shape.lineTo(0.68, 0.62); shape.lineTo(0.25, 0.88);
    shape.quadraticCurveTo(0, 0.56, -0.25, 0.88);
  } else if (category === 'Pants') {
    shape.moveTo(-0.52, 0.88); shape.lineTo(0.52, 0.88);
    shape.lineTo(0.48, 0.12); shape.lineTo(0.42, -0.9);
    shape.lineTo(0.06, -0.9); shape.lineTo(0, -0.05);
    shape.lineTo(-0.06, -0.9); shape.lineTo(-0.42, -0.9);
    shape.lineTo(-0.48, 0.12);
  } else {
    shape.moveTo(-0.38, 0.82); shape.lineTo(-0.78, 0.5);
    shape.lineTo(-0.58, 0.08); shape.lineTo(-0.38, 0.22);
    shape.lineTo(-0.38, -0.78); shape.lineTo(0.38, -0.78);
    shape.lineTo(0.38, 0.22); shape.lineTo(0.58, 0.08);
    shape.lineTo(0.78, 0.5); shape.lineTo(0.38, 0.82);
    shape.quadraticCurveTo(0, 0.53, -0.38, 0.82);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.18, bevelEnabled: true, bevelSegments: 3,
    steps: 1, bevelSize: 0.035, bevelThickness: 0.035
  });
  geometry.center();
  const group = new THREE.Group();
  const roughness = {
    'Cotton fleece': 0.94, Denim: 0.82, Leather: 0.48,
    Silk: 0.24, Linen: 0.96, Jersey: 0.86
  }[materialName] ?? 0.88;
  const cloth = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness, metalness: materialName === 'Leather' ? 0.035 : 0.01 })
  );
  cloth.castShadow = true;
  group.add(cloth);

  // Small construction details make this a garment blockout, not a flat image.
  const seamMat = new THREE.MeshStandardMaterial({ color: 0x37332f, roughness: 1 });
  if (category === 'Hoodie') {
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.2, 0.035), seamMat);
    pocket.position.set(0, -0.28, 0.13);
    group.add(pocket);
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 8, 16, Math.PI), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
    hood.position.set(0, 0.58, -0.02); hood.rotation.z = Math.PI;
    group.add(hood);
  }
  if (category === 'Jacket') {
    const zip = new THREE.Mesh(new THREE.BoxGeometry(0.018, 1.15, 0.035), seamMat);
    zip.position.set(0, 0, 0.13); group.add(zip);
  }
  if (category === 'T-shirt') {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 7, 24), seamMat);
    collar.position.set(0, 0.58, 0.12); group.add(collar);
  }
  group.rotation.x = -0.035;
  return group;
}

function Garment3D({ category, color, material }) {
  const groupRef = useRef(null);
  const garmentRef = useRef(null);
  const cleanupRef = useRef(null);
  const gestureRef = useRef({ dx: 0, dy: 0, dragging: false });
  const latest = useRef({ category, color, material });
  latest.current = { category, color, material };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: (_event, gesture) =>
      Math.abs(gesture.dx) + Math.abs(gesture.dy) > 2,
    onMoveShouldSetPanResponderCapture: (_event, gesture) =>
      Math.abs(gesture.dx) + Math.abs(gesture.dy) > 2,
    onPanResponderGrant: () => {
      gestureRef.current = { dx: 0, dy: 0, dragging: true };
    },
    onPanResponderMove: (_event, gesture) => {
      const deltaX = gesture.dx - gestureRef.current.dx;
      const deltaY = gesture.dy - gestureRef.current.dy;
      if (groupRef.current) {
        groupRef.current.rotation.y += deltaX * 0.012;
        groupRef.current.rotation.x = Math.max(
          -0.62,
          Math.min(0.62, groupRef.current.rotation.x + deltaY * 0.008)
        );
      }
      gestureRef.current.dx = gesture.dx;
      gestureRef.current.dy = gesture.dy;
    },
    onPanResponderRelease: () => {
      gestureRef.current.dragging = false;
      gestureRef.current.dx = 0;
      gestureRef.current.dy = 0;
    },
    onPanResponderTerminate: () => {
      gestureRef.current.dragging = false;
      gestureRef.current.dx = 0;
      gestureRef.current.dy = 0;
    }
  }), []);

  useEffect(() => () => {
    if (cleanupRef.current) cleanupRef.current();
  }, []);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.clear();
    garmentRef.current = makeGarment(category, color, material);
    groupRef.current.add(garmentRef.current);
  }, [category, color, material]);

  const onContextCreate = (gl) => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e8e5de');
    const camera = new THREE.PerspectiveCamera(38, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
    camera.position.set(0, 0.12, 3.7);
    camera.lookAt(0, 0, 0);
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setPixelRatio(1);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x827b70, 1.55));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(3, 4, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.75);
    fill.position.set(-4, 1, 2); scene.add(fill);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.65, 48),
      new THREE.MeshBasicMaterial({ color: '#d8d4cb' })
    );
    floor.rotation.x = -Math.PI / 2; floor.position.y = -1.04; scene.add(floor);
    const group = new THREE.Group();
    groupRef.current = group;
    garmentRef.current = makeGarment(latest.current.category, latest.current.color, latest.current.material);
    group.add(garmentRef.current); scene.add(group);
    let frame;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (!gestureRef.current.dragging) group.rotation.y += 0.0025;
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    animate();
    cleanupRef.current = () => { cancelAnimationFrame(frame); renderer.dispose(); };
  };

  return (
    <View style={styles.glTouchSurface} {...panResponder.panHandlers}>
      <GLView style={styles.glView} onContextCreate={onContextCreate} />
    </View>
  );
}

function Button({ title, onPress, light = false, disabled = false }) {
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress} activeOpacity={0.82}
      style={[styles.button, light && styles.buttonLight, disabled && { opacity: 0.45 }]}>
      <Text style={[styles.buttonText, light && styles.buttonTextLight]}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function App() {
  const [tab, setTab] = useState('Studio');
  const [category, setCategory] = useState('Hoodie');
  const [color, setColor] = useState('#171717');
  const [material, setMaterial] = useState('Cotton fleece');
  const [title, setTitle] = useState('Untitled collection piece');
  const [description, setDescription] = useState('');
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('signin');
  const [busy, setBusy] = useState(false);
  const [designId, setDesignId] = useState(null);
  const [feed, setFeed] = useState([]);
  const [myDesigns, setMyDesigns] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (tab === 'Discover') loadFeed();
    if (tab === 'Profile' && user) loadMyDesigns();
  }, [tab, user]);

  async function loadFeed() {
    const { data, error } = await supabase.from('fashion_designs')
      .select('id,title,description,category,color,material,published_at,user_id')
      .eq('status', 'published').order('published_at', { ascending: false }).limit(30);
    if (error) Alert.alert('Could not load designs', error.message);
    else setFeed(data || []);
  }

  async function loadMyDesigns() {
    const { data, error } = await supabase.from('fashion_designs')
      .select('id,user_id,title,description,category,color,material,status,updated_at')
      .eq('user_id', user.id).order('updated_at', { ascending: false }).limit(50);
    if (error) Alert.alert('Could not load your designs', error.message);
    else setMyDesigns(data || []);
  }

  async function authenticate() {
    if (!email.trim() || password.length < 6) {
      Alert.alert('Check your details', 'Enter your email and a password with at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      const result = authMode === 'signup'
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (result.data.user && result.data.session) {
        const id = result.data.user.id;
        const username = (email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'designer') + '_' + id.slice(0, 5);
        await supabase.from('fashion_profiles').upsert({
          id, username, display_name: email.split('@')[0], updated_at: new Date().toISOString()
        });
        Alert.alert('Welcome', 'You are signed in to Fashion Studio.');
      } else {
        Alert.alert('Check your email', 'Confirm your email address, then sign in.');
      }
    } catch (e) {
      Alert.alert('Account error', e.message || 'Please try again.');
    } finally { setBusy(false); }
  }

  async function saveDesign(status) {
    if (!user) {
      Alert.alert('Sign in first', 'Create an account or sign in to save and publish designs.');
      setTab('Profile'); return;
    }
    if (!title.trim()) { Alert.alert('Add a design name', 'Give your design a name before saving.'); return; }
    setBusy(true);
    const payload = {
      user_id: user.id, title: title.trim(), description: description.trim(),
      category, color, material, status,
      published_at: status === 'published' ? new Date().toISOString() : null,
      settings: { editor_version: 1, preview_type: 'procedural_3d_blockout' },
      updated_at: new Date().toISOString()
    };
    try {
      let result;
      if (designId) {
        result = await supabase.from('fashion_designs').update(payload).eq('id', designId).select('id').single();
      } else {
        result = await supabase.from('fashion_designs').insert(payload).select('id').single();
      }
      if (result.error) throw result.error;
      setDesignId(result.data.id);
      Alert.alert(status === 'published' ? 'Design published' : 'Draft saved',
        status === 'published' ? 'Your design is now in the Discover feed.' : 'Your design is safely saved to your account.');
      if (status === 'published') { setTab('Discover'); loadFeed(); }
      else loadMyDesigns();
    } catch (e) { Alert.alert('Could not save design', e.message || 'Please try again.'); }
    finally { setBusy(false); }
  }

  async function openDesign(item) {
    const isMine = !!user && user.id === item.user_id;
    setDesignId(isMine ? item.id : null);
    setTitle(isMine ? item.title : 'Inspired by ' + item.title); setDescription(item.description || '');
    setCategory(item.category); setColor(item.color || '#171717');
    setMaterial(item.material || 'Cotton fleece'); setTab('Studio');
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Sign out failed', error.message);
    else { setUser(null); setDesignId(null); setMyDesigns([]); }
  }

  const categories = tab === 'Discover' ? ['Streetwear', 'Luxury', 'Casual', 'Formal'] : GARMENTS;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f5f0" />
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>FASHION STUDIO<Text style={{ color: '#bd4b3b' }}>.</Text></Text>
          <Text style={styles.tagline}>DESIGN IT. SHAPE IT. SHARE IT.</Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user ? (user.email?.[0] || 'D').toUpperCase() : 'D'}</Text></View>
      </View>
      <View style={styles.tabs}>
        {['Discover', 'Studio', 'Profile'].map(item => (
          <TouchableOpacity key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabActive]}>
            <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'Studio' && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>THE 3D DESIGN WORKSPACE</Text>
          <Text style={styles.heading}>Make your own{"\n"}fashion statement.</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewTop}><Text style={styles.previewLabel}>LIVE 3D GARMENT VIEW</Text><Text style={styles.previewHint}>360° ROTATION</Text></View>
            <Garment3D category={category} color={color} material={material} />
            <View style={styles.previewBottom}><Text style={styles.previewLabel}>{category.toUpperCase()} / DIGITAL BLOCKOUT</Text><Text style={styles.previewHint}>3D MODEL</Text></View>
          </View>
          <Text style={styles.sectionTitle}>01 / Name your design</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Give your design a name" style={styles.textInput} />
          <Text style={styles.sectionTitle}>02 / Choose a garment</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {GARMENTS.map(item => <TouchableOpacity key={item} onPress={() => { setCategory(item); setDesignId(null); }}
              style={[styles.chip, category === item && styles.chipActive]}><Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text></TouchableOpacity>)}
          </ScrollView>
          <Text style={styles.sectionTitle}>03 / Colour and finish</Text>
          <View style={styles.swatches}>{PALETTE.map(([name, value]) => (
            <TouchableOpacity key={name} onPress={() => setColor(value)} style={[styles.swatchOuter, color === value && styles.swatchSelected]}>
              <View style={[styles.swatch, { backgroundColor: value }]} />
            </TouchableOpacity>
          ))}</View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {['Cotton fleece', 'Denim', 'Leather', 'Silk', 'Linen', 'Jersey'].map(item => (
              <TouchableOpacity key={item} onPress={() => setMaterial(item)} style={[styles.chip, material === item && styles.chipActive]}>
                <Text style={[styles.chipText, material === item && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.sectionTitle}>04 / Design description</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder="Describe the idea behind this piece..." multiline style={[styles.textInput, styles.multiline]} />
          <View style={styles.actionRow}>
            <View style={{ flex: 1 }}><Button title={busy ? 'Working...' : 'Save draft'} light onPress={() => saveDesign('draft')} disabled={busy} /></View>
            <View style={{ flex: 1.25 }}><Button title={busy ? 'Working...' : 'Publish design ↗'} onPress={() => saveDesign('published')} disabled={busy} /></View>
          </View>
          <Text style={styles.note}>Prototype: procedural 3D garment blockout. Production fabric simulation, editable sewing patterns and real-world garment imports are the next build phase.</Text>
        </ScrollView>
      )}

      {tab === 'Discover' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>COMMUNITY RUNWAY</Text>
          <Text style={styles.heading}>Ideas made{"\n"}to be discovered.</Text>
          <Text style={styles.body}>Explore original designs from the next generation of independent fashion creators.</Text>
          <View style={styles.feedHeader}><Text style={styles.sectionTitle}>Latest published designs</Text><TouchableOpacity onPress={loadFeed}><Text style={styles.refresh}>REFRESH</Text></TouchableOpacity></View>
          {feed.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>The runway is waiting.</Text><Text style={styles.body}>Publish the first design from the Studio to start the community feed.</Text><Button title="Create a design" onPress={() => setTab('Studio')} /></View> :
            feed.map(item => <TouchableOpacity key={item.id} onPress={() => openDesign(item)} style={styles.feedCard}>
              <View style={[styles.feedSwatch, { backgroundColor: item.color || '#e9e2d6' }]}><Text style={styles.feedMark}>3D</Text></View>
              <View style={{ flex: 1 }}><Text style={styles.feedCategory}>{(item.category || 'FASHION').toUpperCase()} · {item.material || 'CUSTOM'}</Text><Text style={styles.feedTitle}>{item.title}</Text><Text style={styles.feedDescription}>{item.description || 'An original community design.'}</Text></View>
            </TouchableOpacity>)}
        </ScrollView>
      )}

      {tab === 'Profile' && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>YOUR DESIGNER ACCOUNT</Text>
          <Text style={styles.heading}>{user ? 'Your creative space.' : 'Join the design community.'}</Text>
          {user ? <>
            <View style={styles.profileCard}>
              <View style={styles.bigAvatar}><Text style={styles.bigAvatarText}>{(user.email?.[0] || 'D').toUpperCase()}</Text></View>
              <Text style={styles.profileName}>{user.email}</Text>
              <Text style={styles.body}>Your private drafts and published pieces are stored in your Bouncy Supabase project.</Text>
              <View style={styles.stats}><View><Text style={styles.statNumber}>{myDesigns.length}</Text><Text style={styles.statLabel}>MY DESIGNS</Text></View><View><Text style={styles.statNumber}>{myDesigns.filter(x => x.status === 'published').length}</Text><Text style={styles.statLabel}>PUBLISHED</Text></View></View>
            </View>
            <View style={styles.feedHeader}><Text style={styles.sectionTitle}>My designs</Text><TouchableOpacity onPress={loadMyDesigns}><Text style={styles.refresh}>REFRESH</Text></TouchableOpacity></View>
            {myDesigns.map(item => <TouchableOpacity key={item.id} style={styles.myRow} onPress={() => openDesign(item)}>
              <View style={[styles.miniSwatch, { backgroundColor: item.color || '#ddd' }]} />
              <View style={{ flex: 1 }}><Text style={styles.feedTitle}>{item.title}</Text><Text style={styles.feedCategory}>{item.category} · {item.status.toUpperCase()}</Text></View><Text style={styles.openArrow}>›</Text>
            </TouchableOpacity>)}
            <Button title="Sign out" light onPress={signOut} />
          </> : <>
            <View style={styles.authCard}>
              <Text style={styles.sectionTitle}>{authMode === 'signup' ? 'Create your designer account' : 'Sign in to your account'}</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" autoCapitalize="none" style={styles.textInput} />
              <TextInput value={password} onChangeText={setPassword} placeholder="Password (minimum 6 characters)" secureTextEntry style={styles.textInput} />
              <Button title={busy ? 'Please wait...' : authMode === 'signup' ? 'Create account' : 'Sign in'} onPress={authenticate} disabled={busy} />
              <TouchableOpacity onPress={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')} style={{ padding: 14 }}>
                <Text style={styles.switchAuth}>{authMode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text>
              </TouchableOpacity>
            </View>
          </>}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f5f0' },
  header: { paddingHorizontal: 21, paddingTop: 9, paddingBottom: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#181818', fontSize: 19, fontWeight: '900', letterSpacing: 1.4 },
  tagline: { color: '#8c877e', fontSize: 8, letterSpacing: 1.7, marginTop: 3, fontWeight: '800' },
  avatar: { width: 35, height: 35, borderRadius: 18, backgroundColor: '#202020', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '900' },
  tabs: { flexDirection: 'row', marginHorizontal: 21, borderBottomWidth: 1, borderColor: '#e5e1d8', gap: 23 },
  tab: { paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#bd4b3b' },
  tabText: { color: '#969087', fontSize: 12, fontWeight: '800' },
  tabTextActive: { color: '#181818' },
  content: { padding: 21, paddingBottom: 45 },
  eyebrow: { color: '#bd4b3b', fontSize: 9, letterSpacing: 2, fontWeight: '900', marginBottom: 9 },
  heading: { color: '#171717', fontSize: 29, lineHeight: 34, fontWeight: '900', letterSpacing: -1, marginBottom: 17 },
  previewCard: { backgroundColor: '#e8e5de', borderRadius: 17, overflow: 'hidden', marginBottom: 23 },
  previewTop: { paddingHorizontal: 14, paddingTop: 13, flexDirection: 'row', justifyContent: 'space-between' },
  previewBottom: { paddingHorizontal: 14, paddingBottom: 13, flexDirection: 'row', justifyContent: 'space-between' },
  previewLabel: { color: '#625e57', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  previewHint: { color: '#89847a', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  glTouchSurface: { height: 270, width: '100%', touchAction: 'none' },
  glView: { height: 270, width: '100%' },
  sectionTitle: { color: '#22211f', fontSize: 13, fontWeight: '900', marginBottom: 10, marginTop: 8 },
  textInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8e4dc', borderRadius: 11, paddingHorizontal: 13, paddingVertical: 12, color: '#222', fontSize: 12, marginBottom: 16 },
  multiline: { minHeight: 76, textAlignVertical: 'top' },
  chips: { gap: 8, paddingBottom: 17 },
  chip: { borderWidth: 1, borderColor: '#ded9d0', backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9 },
  chipActive: { backgroundColor: '#1c1c1c', borderColor: '#1c1c1c' },
  chipText: { color: '#5e5a53', fontSize: 10, fontWeight: '800' },
  chipTextActive: { color: '#fff' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 18 },
  swatchOuter: { width: 37, height: 37, borderRadius: 20, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  swatchSelected: { borderColor: '#222' },
  swatch: { width: 26, height: 26, borderRadius: 14, borderWidth: 1, borderColor: '#00000018' },
  actionRow: { flexDirection: 'row', gap: 9, marginTop: 3 },
  button: { backgroundColor: '#bd4b3b', borderRadius: 11, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  buttonLight: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#282828' },
  buttonText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  buttonTextLight: { color: '#282828' },
  note: { color: '#969087', fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 13 },
  body: { color: '#777168', fontSize: 12, lineHeight: 18, marginBottom: 16 },
  feedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  refresh: { color: '#bd4b3b', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  empty: { backgroundColor: '#ebe8e0', padding: 20, borderRadius: 15, marginTop: 15 },
  emptyTitle: { color: '#222', fontSize: 18, fontWeight: '900', marginBottom: 5 },
  feedCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, flexDirection: 'row', gap: 13, marginBottom: 10, borderWidth: 1, borderColor: '#eeeae3', alignItems: 'center' },
  feedSwatch: { width: 75, height: 85, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  feedMark: { color: '#4d4942', fontWeight: '900', fontSize: 22 },
  feedCategory: { color: '#a09a90', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  feedTitle: { color: '#222', fontSize: 13, fontWeight: '900', marginTop: 5 },
  feedDescription: { color: '#817b72', fontSize: 10, marginTop: 5, lineHeight: 14 },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', marginVertical: 16, borderWidth: 1, borderColor: '#eeeae3' },
  bigAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  bigAvatarText: { color: '#fff', fontSize: 23, fontWeight: '900' },
  profileName: { color: '#222', fontSize: 13, fontWeight: '900', marginTop: 11, marginBottom: 8 },
  stats: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', borderTopWidth: 1, borderColor: '#eee', paddingTop: 15, marginTop: 6 },
  statNumber: { color: '#222', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  statLabel: { color: '#999', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 3 },
  myRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 11, borderRadius: 11, marginBottom: 8, gap: 11 },
  miniSwatch: { width: 38, height: 42, borderRadius: 7 },
  openArrow: { color: '#bd4b3b', fontSize: 24, fontWeight: '700' },
  authCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginTop: 15, borderWidth: 1, borderColor: '#eeeae3' },
  switchAuth: { color: '#bd4b3b', fontSize: 11, fontWeight: '800', textAlign: 'center' }
});
