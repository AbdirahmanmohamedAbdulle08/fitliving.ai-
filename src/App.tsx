import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  BarChart3,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Heart,
  Home,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'
import { advanceRepPhase, analyzePushUpPose, classifyRepPhase, type RepPhase } from './pose.ts'
import './App.css'

type Workout = {
  id: string
  name: string
  description: string
  duration: number
  target: number
  category: 'Degdeg' | 'Qoys' | 'Xoog'
  level: string
  color: string
  emoji: string
  exercise: 'squat' | 'jumping-jack' | 'push-up'
}

type Session = {
  date: string
  name: string
  workoutId?: string
  reps: number
  calories: number
  seconds: number
}

type WorkoutSummary = {
  workout: Workout
  reps: number
  calories: number
  seconds: number
}

type Language = 'so' | 'en'

const translations: Record<string, string> = {
  'Dhammaan': 'All',
  'Degdeg': 'Quick',
  'Qoys': 'Family',
  'Xoog': 'Strength',
  'Bilow': 'Beginner',
  'Qof walba': 'All levels',
  'Dhexdhexaad': 'Intermediate',
  'Khabiir': 'Expert',
  'Bilow fudud': 'Easy start',
  'Dhaqdhaqaaq degdeg ah oo jirka oo dhan ah': 'A quick full-body movement session',
  'Qoyska oo wada socda': 'Family workout',
  'Tartan yar oo qoyska oo dhan ku farxo': 'A little challenge the whole family can enjoy',
  'Awood-dhis': 'Build strength',
  'Adkee lugaha iyo murqaha dhexe': 'Strengthen your legs and core',
  'Bilow push-up si tartiib ah': 'Start with a few controlled push-ups',
  'Push-up dhexdhexaad ah oo qaab sax leh': 'Steady push-ups with good form',
  'Push-up adag oo xoog iyo xakameyn leh': 'Advanced push-ups with strength and control',
  'Push-up Bilow': 'Beginner Push-ups',
  'Push-up Dhexdhexaad': 'Intermediate Push-ups',
  'Push-up Khabiir': 'Expert Push-ups',
  'Jirkaaga toosi oo miskaha laabta la sim': 'Keep your body straight and hips aligned with your chest',
  'Dhabarka iyo miskaha toosi ka hor intaadan hoos u degin.': 'Straighten your back and align your hips before lowering.',
  'Firfircooni subaxeed': 'Morning energy',
  'Jumping jacks si dhiiggu u dhaqaaqo': 'Jumping jacks to get your heart moving',
  'Lugaha xooji': 'Stronger legs',
  'Squats deggan oo qaab sax ah leh': 'Controlled squats with good form',
  'Ciyaarta qoyska': 'Family fun',
  'Daqiiqado madadaalo iyo tamar leh': 'A few minutes of fun, energetic movement',
  'Diyaar ma u tahay? Kamarada shid si tirintu u bilaabato.': 'Ready? Turn on your camera to start rep counting.',
  'Browser-kan ma taageero kamarada. Ku fur HTTPS ama localhost.': 'This browser does not support camera access. Use HTTPS or localhost.',
  'Video-ga kamarada lama heli karo.': 'The camera video is unavailable.',
  'Waan ku arkaa! Bilow dhaqdhaqaaqa.': 'I can see you! Start moving.',
  'Fadlan oggolow isticmaalka kamarada browser-ka.': 'Please allow camera access in your browser.',
  'Kamarad lama helin. Ku xidh kamarad si aad u isticmaasho tirinta tooska ah.': 'No camera found. Connect a camera to use live rep counting.',
  'Kamarada ama qaabka AI-ga lama bilaabi karin. Hubi internet-ka, HTTPS, iyo rukhsadda kamarada.': 'The camera or AI model could not start. Check your internet, HTTPS connection, and camera permission.',
  'Meel bannaan istaag, jirka oo dhan kamarada geli.': 'Stand back and fit your whole body inside the camera frame.',
  'Jirka oo dhan geli muuqaalka kamarada.': 'Move back until your whole body is visible in the camera frame.',
  'Waa hagaag! Sii wad xawaarahaas.': 'Great form! Keep that steady pace.',
  'Si fiican u foorarso…': 'Bend your knees a little more.',
  'Sare u kac!': 'Stand back up!',
  'Laabta dhulka u soo dhawee…': 'Lower your chest toward the floor.',
  'Gacmaha si fiican u fidi!': 'Extend your arms fully.',
  'Gacmaha kor u qaad!': 'Raise your arms and spread your feet.',
  'Hadda gacmaha hoos u dhig!': 'Lower your arms and bring your feet together.',
  'Meesha dhexda istaag, madaxa ilaa cagaha ha muuqdaan.': 'Stand in the center, with your head and feet visible.',
  'Istaag si aan jirkaaga oo dhan u arko.': 'Move back so I can see your whole body.',
  'Madaxaaga geli muuqaalka kamarada.': 'Move so your head is inside the camera frame.',
  'Cagaha geli muuqaalka kamarada.': 'Move back so both feet are inside the camera frame.',
  'Dhinac u jeedso kamaradda; garabka, miskaha, canqowga iyo hal gacan oo dhan muuji.': 'Face the camera sideways; show your shoulder, hip, ankle, and one full arm.',
  'Jirka toosi: garabka, miskaha iyo canqowga isku xariiq ka dhig.': 'Straighten your body: align your shoulder, hip, and ankle.',
  'Xusulka si fiican u laab, laabtana hoos u deji.': 'Bend your elbow deeply and lower your chest.',
  'Gacanta si buuxda u fidi adigoo jirka toosan haya.': 'Fully extend your arm while keeping your body straight.',
  'Jirka oo dhan si fiican ayaa loo arkayaa. Diyaar!': 'Your whole body is in view. You are ready!',
  'Jilbaha u laab si qoto dheer, dabadeed si buuxda u istaag.': 'Bend your knees, then stand all the way up.',
  'Laabta hoos u deji, dabadeed gacmaha si buuxda u fidi.': 'Lower your chest, then fully extend your arms.',
  'Gacmaha kor u qaad oo cagaha kala fogee, dabadeed soo celi.': 'Raise your arms and spread your feet, then return to the start.',
  'Waa hagaag! Sii wad.': 'Great! Keep going.',
  'Maanta sidee u dareemaysaa?': 'How are you feeling today?',
  'Dhaqdhaqaaq yar ayaa maalintaada wax badan ka beddeli kara.': 'A little movement can change your whole day.',
  'HIMILADA MAANTA': "TODAY'S GOAL",
  '20 daqiiqo': '20 minutes',
  'Safarkaagu halkan ayuu ka bilaabmaa': 'Your journey starts here',
  'TABABAR BILAABAYAASHA': 'BEGINNER WORKOUT',
  'Jirkaaga dhaqaaji.': 'Move your body.',
  'Maskaxda deji.': 'Clear your mind.',
  '5 daqiiqo oo adiga kuu gaar ah. AI-gaagu wuxuu tirinayaa dhaqdhaqaaq kasta.': 'Five minutes just for you. Your AI coach counts every rep.',
  'Bilaab jimicsiga': 'Start workout',
  '5 daqiiqo': '5 minutes',
  'JIMICSI ADIGA LAGUUGU TALAGALAY': 'MADE FOR YOUR MOVEMENT',
  'Dooro dhaqdhaqaaqaaga maanta': 'Choose your movement today',
  'Eeg dhammaan': 'See all',
  'TALO MAANTA': "TODAY'S TIP",
  'Si tartiib ah u bilow. Joogtayntu waxay ka muhiimsan tahay xawaaraha.': 'Start gently. Consistency matters more than speed.',
  'HORDHAC HORUMAR': 'YOUR PROGRESS',
  'Faahfaahin': 'Details',
  'Wadar reps': 'Total reps',
  'Kaloori': 'Calories',
  'Waqtiga': 'Time',
  'URURINTA JIMICSIYADA': 'WORKOUT LIBRARY',
  'Meel u bannayso dhaqdhaqaaq': 'Make room to move',
  'Jimicsi kuu habboon, waqti kasta oo aad diyaar tahay.': 'Find a workout that fits, whenever you are ready.',
  'TALLAABO YAR, GUUL WEYN': 'SMALL STEPS, BIG WINS',
  'Horumarkaaga waa muuqdaa.': 'Your progress is showing.',
  'Dhaqdhaqaaq kasta oo aad samayso waa tallaabo horay loo qaaday.': 'Every movement is a step forward.',
  'WADARTA REPS': 'TOTAL REPS',
  'KALOOORI LA GUBAY': 'CALORIES BURNED',
  'DAQIIQADO JIMICSI': 'WORKOUT MINUTES',
  'JIMICSIYO LA DHAMMEEYAY': 'WORKOUTS COMPLETED',
  'SAFARKAAGA': 'YOUR JOURNEY',
  'Jimicsiyadii ugu dambeeyay': 'Recent workouts',
  'Sheekadaada guushu halkan ayay ka bilaabataa': 'Your success story starts here',
  'Dhammayso jimicsigaaga koowaad si horumarkaagu u muuqdo.': 'Finish your first workout to see your progress here.',
  'Dooro jimicsi': 'Choose a workout',
  'Jimicsi SOCDA': 'WORKOUT IN PROGRESS',
  'JIMICSI SOCDA': 'WORKOUT IN PROGRESS',
  'KAMARADDU WAA DAMAN TAHAY': 'CAMERA IS OFF',
  'AI WUU KU RAACAYAA': 'AI IS TRACKING YOU',
  'AI-ga waa la diyaarinayaa…': 'Preparing the AI coach…',
  'Sug daqiiqad yar inta model-ku furmayo.': 'Please wait while the pose model loads.',
  'Ku xidh kamaradaada': 'Connect your camera',
  'AI-gu wuxuu dhaqdhaqaaqaaga ku tirinayaa si toos ah.': 'The AI coach counts your reps in real time.',
  'Fadlan sug…': 'Please wait…',
  'Daar kamarada': 'Turn on camera',
  'AI-ga wuxuu ku shaqeeyaa qalabkaaga': 'AI runs on your device',
  'Fiidiyowga lama kaydiyo': 'Video is never recorded',
  'HIMILO': 'GOAL',
  'waa la qabtay': 'complete',
  'WAQTIGA': 'TIME',
  'TAMARTA': 'ENERGY',
  'Sii wad': 'Resume',
  'Hakinta': 'Pause',
  'Dhammayso': 'Finish',
  'Demi kamarada': 'Turn off camera',
  'Mar kale isku day': 'Try again',
  'Dhegayso jirkaaga oo samee dhaqdhaqaaq kugu habboon. Tirinta AI-gu waa qiyaas.': 'Listen to your body and move at a comfortable pace. AI rep counts are estimates.',
  'NASASHO YAR': 'TAKE A BREATHER',
  'Neefso. Waad fiican tahay.': 'Breathe. You are doing great.',
  'Markaad diyaar tahay, sii wad halkaad joogtay.': 'Pick up where you left off when you are ready.',
  'Sii wad jimicsiga': 'Resume workout',
  'Dhammayso hadda': 'Finish workout',
  'Qol fadhigaaga': 'Your living room',
  'Hoyga': 'Home',
  'Jimicsiyada': 'Workouts',
  'Horumarkayga': 'My progress',
  'MEESHAADA': 'YOUR SPACE',
  'Safarkaagu ha bilaabmo': 'Your journey starts here',
  'Bilow wanaagsan!': 'Great start!',
  ' jimicsi ayaad qabatay': ' workouts completed',
  'Jimicsigaaga koowaad maanta': 'Your first workout is waiting',
  'Qorshaha guriga': 'Home plan',
  'AI diyaar ah': 'AI ready',
  'MAANTA': 'TODAY',
  'JIMICSI GURIGAAGA · KU HABBOON QOYSKA': 'WORK OUT AT HOME · MADE FOR FAMILIES',
  'TV REMOTE MODE': 'TV REMOTE MODE',
  'Gacmaha iyo garbaha dhinacooda u jeedi kamarada.': 'Turn slightly sideways so the camera can see your shoulders, elbows, and wrists.',
  'Qofka waa la arkayaa': 'Body in frame',
  'Qofka waa la raadinayaa': 'Finding full body',
  'HALKAN ISTAAG': 'STAND HERE',
  'TABABARE CAQLI BADAN': 'SMART COACH',
  'TAMAR FIICAN': 'GOOD ENERGY',
  'AI COACH': 'AI COACH',
  'Jimicsiga waa la dhammaystiray, balse taariikhda laguma kaydin karin browser-kan.': 'Workout finished, but it could not be saved in this browser.',
  'Taariikhda hore lama akhrin karin. Kaydinta browser-ka hubi.': 'Workout history could not be read. Check your browser storage.',
  'Dhawaaqyada': 'Sound effects',
  'Codka tababaraha': 'Coach voice',
  'Xir tababarka': 'Close workout',
  'Kordhi dhammaan jirka': 'Full-body workout',
  'Jimicsigii ugu dambeeyay': 'Latest workout',
  'Weli jimicsi lama dhamaystirin': 'No completed workouts yet',
  'gacmo muuqda': 'ARMS IN FRAME',
  'Himiladii maanta waa la gaaray!': "Today's goal reached!",
  'Hambalyo! Jimicsigu Wuu Dhamaaday': 'Workout Complete!',
  'Waqtiga guud': 'Total Time',
  'Kalooriyada la qiyaasay': 'Estimated Calories',
  'Ku noqo Hoyga': 'Back to Home',
  'Jimicsi kale samee': 'Do Another Workout',
  'Ma ka baxaysaa jimicsiga oo aad Hoyga aadaysaa?': 'Exit workout to Home?',
  'Haa, bax': 'Yes',
}

const exerciseFeedback: Record<Language, Record<string, string>> = {
  so: {
    'squat-down': 'Jilbaha u laab si qoto dheer…',
    'squat-up': 'Hadda si buuxda u istaag!',
    'push-down': 'Laabta hoos u deji…',
    'push-up': 'Gacmaha si buuxda u fidi!',
    'jack-open': 'Gacmaha kor u qaad, cagahana kala fogee!',
    'jack-close': 'Gacmaha hoos u dhig, cagahana isu keen!',
    'good': 'Waa hagaag! Sii wad.',
    'missing': 'Jirka oo dhan geli muuqaalka kamarada.',
    'too-low': 'Cagahaagu way ka baxayaan frame-ka. Kaamirada dib uga durug.',
    'too-high': 'Madaxaagu wuu ka baxayaa frame-ka. Kaamirada dib uga durug.',
    'off-center': 'Dhexda frame-ka istaag si aan si fiican kuu arko.',
    'ready': 'Jirka oo dhan si fiican ayaa loo arkayaa. Diyaar!',
    'framing': 'Ka durug kamarada ilaa madaxa iyo cagaha oo dhan muuqdaan.',
  },
  en: {
    'squat-down': 'Bend your knees a little deeper…',
    'squat-up': 'Stand all the way back up!',
    'push-down': 'Lower your chest toward the floor…',
    'push-up': 'Fully extend your arms!',
    'jack-open': 'Raise your arms and spread your feet!',
    'jack-close': 'Lower your arms and bring your feet together!',
    'good': 'Great form! Keep going.',
    'missing': 'Fit your whole body inside the camera frame.',
    'too-low': 'Your feet are leaving the frame. Move the camera farther back.',
    'too-high': 'Your head is leaving the frame. Move the camera farther back.',
    'off-center': 'Stand in the middle of the frame so I can see you clearly.',
    'ready': 'Your whole body is in view. You are ready!',
    'framing': 'Move farther from the camera until your head and feet are visible.',
  },
}

const workouts: Workout[] = [
  {
    id: 'quick-burn',
    name: 'Bilow fudud',
    description: 'Dhaqdhaqaaq degdeg ah oo jirka oo dhan ah',
    duration: 5,
    target: 20,
    category: 'Degdeg',
    level: 'Bilow',
    color: 'peach',
    emoji: '⚡',
    exercise: 'squat',
  },
  {
    id: 'family-fun',
    name: 'Qoyska oo wada socda',
    description: 'Tartan yar oo qoyska oo dhan ku farxo',
    duration: 8,
    target: 24,
    category: 'Qoys',
    level: 'Qof walba',
    color: 'violet',
    emoji: '✨',
    exercise: 'jumping-jack',
  },
  {
    id: 'push-up-beginner',
    name: 'Push-up Bilow',
    description: 'Bilow push-up si tartiib ah',
    duration: 5,
    target: 5,
    category: 'Xoog',
    level: 'Bilow',
    color: 'blue',
    emoji: '🌱',
    exercise: 'push-up',
  },
  {
    id: 'strength',
    name: 'Push-up Dhexdhexaad',
    description: 'Push-up dhexdhexaad ah oo qaab sax leh',
    duration: 8,
    target: 12,
    category: 'Xoog',
    level: 'Dhexdhexaad',
    color: 'green',
    emoji: '💪',
    exercise: 'push-up',
  },
  {
    id: 'push-up-expert',
    name: 'Push-up Khabiir',
    description: 'Push-up adag oo xoog iyo xakameyn leh',
    duration: 12,
    target: 20,
    category: 'Xoog',
    level: 'Khabiir',
    color: 'orange',
    emoji: '🔥',
    exercise: 'push-up',
  },
  {
    id: 'morning-move',
    name: 'Firfircooni subaxeed',
    description: 'Jumping jacks si dhiiggu u dhaqaaqo',
    duration: 5,
    target: 25,
    category: 'Degdeg',
    level: 'Bilow',
    color: 'blue',
    emoji: '🌤️',
    exercise: 'jumping-jack',
  },
  {
    id: 'squat-challenge',
    name: 'Lugaha xooji',
    description: 'Squats deggan oo qaab sax ah leh',
    duration: 10,
    target: 30,
    category: 'Xoog',
    level: 'Dhexdhexaad',
    color: 'orange',
    emoji: '🏋️',
    exercise: 'squat',
  },
  {
    id: 'family-strength',
    name: 'Ciyaarta qoyska',
    description: 'Daqiiqado madadaalo iyo tamar leh',
    duration: 7,
    target: 20,
    category: 'Qoys',
    level: 'Qof walba',
    color: 'pink',
    emoji: '🎈',
    exercise: 'jumping-jack',
  },
]

const poseConnections: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
  [24, 26], [26, 28], [27, 31], [28, 32],
]

function workoutInLanguage(workout: Workout, language: Language): Workout {
  if (language === 'so') return workout
  return {
    ...workout,
    name: translations[workout.name] ?? workout.name,
    description: translations[workout.description] ?? workout.description,
    category: (translations[workout.category] ?? workout.category) as Workout['category'],
    level: translations[workout.level] ?? workout.level,
  }
}

function feedbackInLanguage(value: string, language: Language): string {
  if (language === 'en') {
    const key = Object.entries(exerciseFeedback.so).find(([, somali]) => somali === value)?.[0]
    return key ? exerciseFeedback.en[key] ?? value : translations[value] ?? value
  }
  const key = Object.entries(exerciseFeedback.en).find(([, english]) => english === value)?.[0]
  return key ? exerciseFeedback.so[key] ?? value : Object.entries(translations).find(([, english]) => english === value)?.[0] ?? value
}

function sessionNameInLanguage(session: Session, language: Language): string {
  if (session.workoutId) {
    const workout = workouts.find((item) => item.id === session.workoutId)
    if (workout) return workoutInLanguage(workout, language).name
  }
  if (language === 'en') return translations[session.name] ?? session.name
  return Object.entries(translations).find(([, english]) => english === session.name)?.[0] ?? session.name
}

function readSessions(): { sessions: Session[]; error: string } {
  try {
    const saved = localStorage.getItem('fitliving-sessions')
    const sessions: unknown = saved ? JSON.parse(saved) : []
    if (!Array.isArray(sessions)) throw new Error('Invalid workout history')
    return { sessions: sessions as Session[], error: '' }
  } catch {
    return { sessions: [], error: 'Taariikhda hore lama akhrin karin. Kaydinta browser-ka hubi.' }
  }
}

function readLanguage(): Language {
  try {
    return localStorage.getItem('fitliving-language') === 'en' ? 'en' : 'so'
  } catch {
    return 'so'
  }
}

function visibleLandmark(point: NormalizedLandmark | undefined, threshold = 0.5): point is NormalizedLandmark {
  return Boolean(point && (point.visibility ?? 0) >= threshold)
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

function App() {
  const [language, setLanguage] = useState<Language>(readLanguage)
  const t = useCallback((text: string) => language === 'so'
    ? Object.entries(translations).find(([, english]) => english === text)?.[0] ?? text
    : translations[text] ?? text, [language])
  const coachText = useCallback((key: string) => exerciseFeedback[language][key] ?? key, [language])
  const [page, setPage] = useState<'home' | 'workouts' | 'stats'>('home')
  const [category, setCategory] = useState('Dhammaan')
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null)
  const [initialHistory] = useState(readSessions)
  const [sessions, setSessions] = useState<Session[]>(initialHistory.sessions)
  const [historyError, setHistoryError] = useState(initialHistory.error)
  const [summary, setSummary] = useState<WorkoutSummary | null>(null)
  const [reps, setReps] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [paused, setPaused] = useState(false)
  const [exitConfirm, setExitConfirm] = useState(false)
  const [repPulse, setRepPulse] = useState(false)
  const [cameraState, setCameraState] = useState<'off' | 'starting' | 'on' | 'error'>('off')
  const [cameraError, setCameraError] = useState('')
  const [feedback, setFeedback] = useState(() => language === 'so'
    ? 'Diyaar ma u tahay? Kamarada shid si tirintu u bilaabato.'
    : translations['Diyaar ma u tahay? Kamarada shid si tirintu u bilaabato.'] ?? 'Ready? Turn on your camera to start rep counting.')
  const [poseReady, setPoseReady] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [musicEnabled, setMusicEnabled] = useState(false)
  const [showRemote, setShowRemote] = useState(true)
  const [today] = useState(() => new Date())
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)
  const lastDetectionRef = useRef(0)
  const lastRepRef = useRef(0)
  const phaseRef = useRef<RepPhase | null>(null)
  const candidatePhaseRef = useRef<RepPhase | null>(null)
  const stablePhaseFramesRef = useRef(0)
  const completionRef = useRef(false)
  const repsRef = useRef(0)
  const secondsRef = useRef(0)
  const repPulseTimeoutRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const musicIntervalRef = useRef<number | null>(null)

  const playTone = useCallback((frequency = 680, duration = 0.12) => {
    if (!soundEnabled) return
    const AudioContextClass = window.AudioContext
    if (!AudioContextClass) return
    const context = audioContextRef.current ?? new AudioContextClass()
    audioContextRef.current = context
    if (context.state === 'suspended') void context.resume()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.11, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + duration)
  }, [soundEnabled])

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language === 'so' ? 'so-SO' : 'en-US'
    utterance.rate = 1
    window.speechSynthesis.speak(utterance)
  }, [language, voiceEnabled])

  useEffect(() => {
    try {
      localStorage.setItem('fitliving-language', language)
    } catch {
      // The language remains available for this session when storage is disabled.
    }
  }, [language])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page, activeWorkout])

  const stopCamera = useCallback(() => {
    if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
    animationRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    landmarkerRef.current?.close()
    landmarkerRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const completeWorkout = useCallback(() => {
    if (!activeWorkout) return
    if (completionRef.current) return
    completionRef.current = true
    const completedReps = repsRef.current
    const completedSeconds = secondsRef.current
    const session: Session = {
      date: new Date().toISOString(),
      name: workoutInLanguage(activeWorkout, language).name,
      workoutId: activeWorkout.id,
      reps: completedReps,
      calories: Math.round(completedReps * 0.4),
      seconds: completedSeconds,
    }
    const updated = [session, ...sessions].slice(0, 50)
    setSessions(updated)
    try {
      localStorage.setItem('fitliving-sessions', JSON.stringify(updated))
      setHistoryError('')
    } catch {
      setHistoryError('Jimicsiga waa la dhammaystiray, balse taariikhda laguma kaydin karin browser-kan.')
    }
    setSummary({
      workout: activeWorkout,
      reps: completedReps,
      calories: session.calories,
      seconds: completedSeconds,
    })
    setActiveWorkout(null)
    setPaused(false)
    setExitConfirm(false)
    setCameraState('off')
    speak(language === 'so' ? 'Hambalyo! Jimicsigu wuu dhammaaday!' : 'Great job! Workout completed!')
    stopCamera()
  }, [activeWorkout, language, sessions, speak, stopCamera])

  const goHome = useCallback(() => {
    setSummary(null)
    setActiveWorkout(null)
    setPaused(false)
    setExitConfirm(false)
    setCameraState('off')
    setPage('home')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    stopCamera()
  }, [stopCamera])

  const handleBack = useCallback(() => {
    if (summary) {
      goHome()
      return
    }
    if (activeWorkout) {
      if (paused) goHome()
      else {
        setPaused(true)
        setExitConfirm(true)
      }
      return
    }
    setPage('home')
  }, [activeWorkout, goHome, paused, summary])

  const addRep = useCallback(() => {
    if (completionRef.current) return
    const next = repsRef.current + 1
    repsRef.current = next
    setReps(next)
    if (next % 5 === 0) {
      speak(language === 'so' ? `Aad baad u fiican tahay! ${next} reps.` : `Great work! ${next} reps.`)
    }
    setFeedback(coachText('good'))
    playTone(760, 0.16)
    if (activeWorkout && next >= activeWorkout.target) completeWorkout()
  }, [activeWorkout, coachText, completeWorkout, language, playTone, speak])

  const manualRep = useCallback(() => {
    if (!activeWorkout || paused) return
    addRep()
    setRepPulse(true)
    if (repPulseTimeoutRef.current !== null) window.clearTimeout(repPulseTimeoutRef.current)
    repPulseTimeoutRef.current = window.setTimeout(() => {
      setRepPulse(false)
      repPulseTimeoutRef.current = null
    }, 260)
  }, [activeWorkout, addRep, paused])

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t('Browser-kan ma taageero kamarada. Ku fur HTTPS ama localhost.'))
      setCameraState('error')
      return
    }
    setCameraState('starting')
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (!videoRef.current) throw new Error('Video-ga kamarada lama heli karo.')
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm',
      )
      const modelAssetPath =
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
      const isPushUp = activeWorkout?.exercise === 'push-up'
      const options = {
        baseOptions: { modelAssetPath },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: isPushUp ? 0.4 : 0.55,
        minPosePresenceConfidence: isPushUp ? 0.4 : 0.55,
        minTrackingConfidence: isPushUp ? 0.4 : 0.55,
      } as const
      try {
        landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          ...options,
          baseOptions: { ...options.baseOptions, delegate: 'GPU' },
        })
      } catch {
        landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          ...options,
          baseOptions: { ...options.baseOptions, delegate: 'CPU' },
        })
      }
      setCameraState('on')
      setFeedback(language === 'so' ? 'Waan ku arkaa! Bilow dhaqdhaqaaqa.' : 'I can see you! Start moving.')
      speak(language === 'so' ? 'Waan ku arkaa! Bilow dhaqdhaqaaqa.' : 'I can see you! Start moving.')
      playTone(620, 0.1)
    } catch (error) {
      stopCamera()
      setCameraState('error')
      const message = error instanceof DOMException ? error.name : error instanceof Error ? error.message : 'Kamarada lama bilaabi karin.'
      setCameraError(
        message.includes('NotAllowedError')
          ? t('Fadlan oggolow isticmaalka kamarada browser-ka.')
          : message.includes('NotFoundError')
            ? t('Kamarad lama helin. Ku xidh kamarad si aad u isticmaasho tirinta tooska ah.')
            : t('Kamarada ama qaabka AI-ga lama bilaabi karin. Hubi internet-ka, HTTPS, iyo rukhsadda kamarada.'),
      )
    }
  }, [activeWorkout, language, playTone, speak, stopCamera, t])

  const startWorkout = useCallback((workout: Workout) => {
    completionRef.current = false
    setSummary(null)
    setExitConfirm(false)
    setActiveWorkout(workout)
    setPage('home')
    repsRef.current = 0
    secondsRef.current = 0
    setReps(0)
    setSeconds(0)
    setPaused(false)
    phaseRef.current = null
    candidatePhaseRef.current = null
    stablePhaseFramesRef.current = 0
    lastRepRef.current = 0
    setPoseReady(false)
    setFeedback(t('Meel bannaan istaag, jirka oo dhan kamarada geli.'))
    setRepPulse(false)
    playTone(560, 0.14)
  }, [playTone, t])

  useEffect(() => {
    if (!activeWorkout || paused) return
    const interval = window.setInterval(() => {
      const next = secondsRef.current + 1
      secondsRef.current = next
      setSeconds(next)
      if (next >= activeWorkout.duration * 60) completeWorkout()
    }, 1000)
    return () => window.clearInterval(interval)
  }, [activeWorkout, completeWorkout, paused])

  useEffect(() => {
    if (!activeWorkout || paused || cameraState !== 'on') return
    let active = true
    const detect = () => {
      if (!active) return
      const video = videoRef.current
      const canvas = canvasRef.current
      const landmarker = landmarkerRef.current
      if (video && canvas && landmarker && video.readyState >= 2) {
        const now = performance.now()
        if (now - lastDetectionRef.current >= 100) {
          lastDetectionRef.current = now
          const result = landmarker.detectForVideo(video, now)
          const landmarks = result.landmarks[0]
          const context = canvas.getContext('2d')
          if (context) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            context.clearRect(0, 0, canvas.width, canvas.height)
            if (landmarks) {
              context.fillStyle = 'rgba(125, 255, 78, 0.1)'
              context.fillRect(0, 0, canvas.width, canvas.height)
              const visiblePoints = landmarks.filter((point) =>
                point.visibility === undefined || point.visibility > 0.35)
              const bounds = visiblePoints.reduce(
                (box, point) => ({
                  minX: Math.min(box.minX, point.x * canvas.width),
                  minY: Math.min(box.minY, point.y * canvas.height),
                  maxX: Math.max(box.maxX, point.x * canvas.width),
                  maxY: Math.max(box.maxY, point.y * canvas.height),
                }),
                {
                  minX: canvas.width,
                  minY: canvas.height,
                  maxX: 0,
                  maxY: 0,
                },
              )
              if (visiblePoints.length > 0) {
                const padding = Math.max(12, canvas.width * 0.025)
                const left = Math.max(0, bounds.minX - padding)
                const top = Math.max(0, bounds.minY - padding)
                const right = Math.min(canvas.width, bounds.maxX + padding)
                const bottom = Math.min(canvas.height, bounds.maxY + padding)
                context.fillStyle = 'rgba(125, 255, 78, 0.12)'
                context.fillRect(left, top, right - left, bottom - top)
                context.strokeStyle = '#7dff4e'
                context.lineWidth = Math.max(2, canvas.width / 320)
                context.strokeRect(left, top, right - left, bottom - top)
              }
              context.strokeStyle = '#a6ff76'
              context.lineWidth = Math.max(3, canvas.width / 250)
              context.lineCap = 'round'
              for (const [start, end] of poseConnections) {
                const a = landmarks[start]
                const b = landmarks[end]
                if (a && b && a.visibility !== undefined && b.visibility !== undefined && a.visibility > 0.35 && b.visibility > 0.35) {
                  context.beginPath()
                  context.moveTo(a.x * canvas.width, a.y * canvas.height)
                  context.lineTo(b.x * canvas.width, b.y * canvas.height)
                  context.stroke()
                }
              }
              context.fillStyle = '#d6ffba'
              for (const point of landmarks) {
                if (point.visibility !== undefined && point.visibility < 0.35) continue
                context.beginPath()
                context.arc(point.x * canvas.width, point.y * canvas.height, Math.max(3, canvas.width / 160), 0, Math.PI * 2)
                context.fill()
              }
              detectRep(landmarks)
            } else {
              setPoseReady(false)
              setFeedback(coachText('missing'))
            }
          }
        }
      }
      animationRef.current = requestAnimationFrame(detect)
    }
    const detectRep = (points: NormalizedLandmark[]) => {
      const now = performance.now()
      const workout = activeWorkout
      const isPushUp = workout.exercise === 'push-up'
      const required = workout.exercise === 'squat'
        ? [0, 11, 12, 23, 24, 25, 26, 27, 28]
        : isPushUp ? [] : [0, 11, 12, 15, 16, 23, 24, 27, 28]
      const visibleThreshold = isPushUp ? 0.3 : 0.45
      const pushUpPose = isPushUp ? analyzePushUpPose(points) : null
      const missing = isPushUp
        ? pushUpPose?.reason === 'missing-points'
        : required.some((index) => !visibleLandmark(points[index], visibleThreshold))
      if (missing) {
        setPoseReady(false)
        setFeedback(isPushUp
          ? t('Dhinac u jeedso kamaradda; garabka, miskaha, canqowga iyo hal gacan oo dhan muuji.')
          : coachText('framing'))
        candidatePhaseRef.current = null
        stablePhaseFramesRef.current = 0
        return
      }
      if (pushUpPose?.reason === 'poor-plank') {
        setPoseReady(true)
        setFeedback(t('Jirka toosi: garabka, miskaha iyo canqowga isku xariiq ka dhig.'))
        candidatePhaseRef.current = null
        stablePhaseFramesRef.current = 0
        return
      }
      if (!isPushUp) {
        const centerX = ((points[11]!.x + points[12]!.x + points[23]!.x + points[24]!.x) / 4)
        if (centerX < 0.12 || centerX > 0.88) {
          setPoseReady(false)
          setFeedback(coachText('off-center'))
          candidatePhaseRef.current = null
          stablePhaseFramesRef.current = 0
          return
        }
      }
      setPoseReady(true)

      const candidate = pushUpPose?.phase ?? (isPushUp ? null : classifyRepPhase(workout.exercise, points))
      if (!candidate) {
        if (isPushUp) setFeedback(t('Xusulka si fiican u laab, laabtana hoos u deji.'))
        candidatePhaseRef.current = null
        stablePhaseFramesRef.current = 0
        return
      }
      const activeFeedback = workout.exercise === 'squat'
        ? coachText('squat-up')
        : isPushUp ? t('Xusulka si fiican u laab, laabtana hoos u deji.') : coachText('jack-close')
      const readyFeedback = workout.exercise === 'squat'
        ? coachText('squat-down')
        : isPushUp ? t('Gacmaha si buuxda u fidi adigoo jirka toosan haya.') : coachText('jack-open')
      if (candidatePhaseRef.current === candidate) {
        stablePhaseFramesRef.current += 1
      } else {
        candidatePhaseRef.current = candidate
        stablePhaseFramesRef.current = 1
      }
      if (stablePhaseFramesRef.current < 2 || now - lastRepRef.current < 850) return
      const transition = advanceRepPhase(phaseRef.current, candidate)
      if (transition.phase === null) {
        if (isPushUp) setFeedback(t('Gacmaha si buuxda u fidi adigoo jirka toosan haya.'))
        return
      }
      phaseRef.current = transition.phase
      if (transition.counted) {
        lastRepRef.current = now
        addRep()
      }
      if (candidate === 'active') {
        setFeedback(activeFeedback)
      } else setFeedback(readyFeedback)
    }
    animationRef.current = requestAnimationFrame(detect)
    return () => {
      active = false
      candidatePhaseRef.current = null
      stablePhaseFramesRef.current = 0
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
    }
  }, [activeWorkout, addRep, cameraState, coachText, language, paused, t])

  useEffect(() => {
    if (!musicEnabled || paused || !activeWorkout) {
      if (musicIntervalRef.current !== null) window.clearInterval(musicIntervalRef.current)
      musicIntervalRef.current = null
      return
    }
    const AudioContextClass = window.AudioContext
    if (!AudioContextClass) return
    const context = audioContextRef.current ?? new AudioContextClass()
    audioContextRef.current = context
    if (context.state === 'suspended') void context.resume()
    const notes = [261.63, 329.63, 392, 329.63]
    let note = 0
    const playPad = () => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'triangle'
      oscillator.frequency.value = notes[note++ % notes.length]
      gain.gain.setValueAtTime(0.0001, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.025, context.currentTime + 0.15)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.2)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 1.25)
    }
    playPad()
    musicIntervalRef.current = window.setInterval(playPad, 750)
    return () => {
      if (musicIntervalRef.current !== null) window.clearInterval(musicIntervalRef.current)
      musicIntervalRef.current = null
    }
  }, [musicEnabled, paused, activeWorkout])

  useEffect(() => () => {
    stopCamera()
    if (repPulseTimeoutRef.current !== null) window.clearTimeout(repPulseTimeoutRef.current)
    if (musicIntervalRef.current !== null) window.clearInterval(musicIntervalRef.current)
    audioContextRef.current?.close()
    window.speechSynthesis?.cancel()
  }, [stopCamera])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Home') {
        event.preventDefault()
        if (summary) goHome()
        else if (activeWorkout) setPaused(true)
        else {
          setPage('home')
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
        return
      }
      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault()
        handleBack()
        return
      }
      if (event.code === 'Space') {
        if (activeWorkout && !paused) {
          event.preventDefault()
          if (!event.repeat) manualRep()
        }
        return
      }
      const directions: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      }
      const direction = directions[event.key]
      if (!direction) return
      const focused = document.activeElement
      if (focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement) return
      const focusScope = summary
        ? document.querySelector('.summary-overlay')
        : exitConfirm
          ? document.querySelector('.exit-confirm')
          : document
      const buttons = Array.from(focusScope?.querySelectorAll<HTMLButtonElement>('[data-tv-focus]:not(:disabled)') ?? [])
      if (buttons.length === 0) return
      event.preventDefault()
      const current = focused instanceof HTMLElement ? focused.closest<HTMLButtonElement>('[data-tv-focus]') : null
      const source = current?.getBoundingClientRect()
      if (!source) {
        buttons[0]?.focus()
        return
      }
      const originX = source.left + source.width / 2
      const originY = source.top + source.height / 2
      const candidates = buttons
        .filter((button) => button !== current)
        .map((button) => {
          const rect = button.getBoundingClientRect()
          const dx = rect.left + rect.width / 2 - originX
          const dy = rect.top + rect.height / 2 - originY
          const primary = dx * direction[0] + dy * direction[1]
          const secondary = Math.abs(dx * direction[1] - dy * direction[0])
          return { button, score: primary > 0 ? primary + secondary * 1.8 : Number.POSITIVE_INFINITY }
        })
        .sort((a, b) => a.score - b.score)
      if (candidates[0] && Number.isFinite(candidates[0].score)) candidates[0].button.focus()
      else if (current) current.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeWorkout, exitConfirm, goHome, handleBack, manualRep, paused, summary])

  useEffect(() => {
    if (!summary && !exitConfirm) return
    const selector = summary ? '.summary-overlay' : '.exit-confirm'
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`${selector} [data-tv-focus]`)?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [exitConfirm, summary])

  const filteredWorkouts = workouts.filter((workout) => category === 'Dhammaan' || workout.category === category)
  const displayWorkout = activeWorkout ? workoutInLanguage(activeWorkout, language) : null
  const totalReps = sessions.reduce((sum, session) => sum + session.reps, 0)
  const totalCalories = sessions.reduce((sum, session) => sum + session.calories, 0)
  const totalMinutes = Math.floor(sessions.reduce((sum, session) => sum + session.seconds, 0) / 60)
  const todaySeconds = sessions
    .filter((session) => new Date(session.date).toDateString() === today.toDateString())
    .reduce((sum, session) => sum + session.seconds, 0)
  const todayMinutes = Math.floor(todaySeconds / 60)
  const dailyGoalProgress = Math.min(100, Math.round((todayMinutes / 20) * 100))
  const latestSession = sessions[0]
  const progress = activeWorkout ? Math.min(100, Math.round((reps / activeWorkout.target) * 100)) : 0

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); setPage('home') }}>
          <span className="brand-mark"><Activity size={23} strokeWidth={2.6} /></span>
          <span>fitliving<span className="brand-ai">.ai</span><small>{language === 'so' ? 'TABABARE CAQLI BADAN' : 'SMART COACH'}</small></span>
        </a>
        <div className="sidebar-label">{t('MEESHAADA')}</div>
        <nav className="main-nav" aria-label={language === 'so' ? 'Meelaha app-ka' : 'App navigation'}>
          <button data-tv-focus className={page === 'home' ? 'nav-item selected' : 'nav-item'} onClick={() => { setPage('home'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Home size={19} /> <span>{t('Hoyga')}</span></button>
          <button data-tv-focus className={page === 'workouts' ? 'nav-item selected' : 'nav-item'} onClick={() => setPage('workouts')}><Dumbbell size={19} /> <span>{t('Jimicsiyada')}</span><span className="nav-count">{String(workouts.length).padStart(2, '0')}</span></button>
          <button data-tv-focus className={page === 'stats' ? 'nav-item selected' : 'nav-item'} onClick={() => setPage('stats')}><BarChart3 size={19} /> <span>{t('Horumarkayga')}</span></button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="streak-card">
          <div className="streak-icon"><Flame size={19} fill="currentColor" /></div>
          <div><strong>{t(sessions.length ? 'Bilow wanaagsan!' : 'Safarkaagu ha bilaabmo')}</strong><p>{sessions.length ? `${sessions.length}${t(' jimicsi ayaad qabatay')}` : t('Jimicsigaaga koowaad maanta')}</p></div>
          <ChevronRight size={17} />
        </div>
        <div className="profile">
          <div className="avatar">F</div>
          <div className="profile-name"><strong>{language === 'so' ? 'Qoyska' : 'Family'}</strong><span>{t('Qorshaha guriga')}</span></div>
          <button data-tv-focus className="icon-button profile-menu" aria-label={language === 'so' ? 'Dejinta' : 'Settings'}><span>•••</span></button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">{t('Qol fadhigaaga')} <span>/</span> <strong>{t(page === 'home' ? 'Hoyga' : page === 'workouts' ? 'Jimicsiyada' : 'Horumarkayga')}</strong></div>
          <div className="topbar-right"><div className="language-switch" role="group" aria-label={language === 'so' ? 'Dooro luqadda' : 'Choose language'}><button data-tv-focus aria-pressed={language === 'so'} className={language === 'so' ? 'language-option active' : 'language-option'} onClick={() => setLanguage('so')}>SO</button><button data-tv-focus aria-pressed={language === 'en'} className={language === 'en' ? 'language-option active' : 'language-option'} onClick={() => setLanguage('en')}>EN</button></div><span className="camera-ready"><span /> {t('AI diyaar ah')}</span><div className="date-chip"><span>{t('MAANTA')}</span><strong>{new Intl.DateTimeFormat(language === 'so' ? 'so-SO' : 'en-US', { day: 'numeric', month: 'short' }).format(today)}</strong></div></div>
        </header>

        {page === 'home' && !activeWorkout && (
          <div className="page-content home-page">
            <section className="welcome-row">
              <div><div className="eyebrow"><span className="eyebrow-line" /> {language === 'so' ? 'JIMICSI GURIGA AH, SI FUDUD' : 'A BETTER WAY TO MOVE AT HOME'}</div><h1>{t('Maanta sidee u dareemaysaa?')}</h1><p className="section-subtitle">{t('Dhaqdhaqaaq yar ayaa maalintaada wax badan ka beddeli kara.')}</p></div>
              <div className="daily-goal"><div className="goal-ring" style={{ '--goal-progress': `${dailyGoalProgress}%` } as React.CSSProperties}><Heart size={19} /><span>{todayMinutes}<span>/20</span></span></div><div><small>{t('HIMILADA MAANTA')}</small><strong>{t('20 daqiiqo')}</strong><span>{todayMinutes >= 20 ? t('Himiladii maanta waa la gaaray!') : `${todayMinutes} ${language === 'so' ? 'daqiiqo maanta' : 'minutes today'}`}</span></div></div>
            </section>

            <section className="hero-banner">
              <div className="hero-copy"><div className="live-pill"><span /> {t('TABABAR BILAABAYAASHA')}</div><h2>{t('Jirkaaga dhaqaaji.')}<br /><span>{t('Maskaxda deji.')}</span></h2><p>{t('5 daqiiqo oo adiga kuu gaar ah. AI-gaagu wuxuu tirinayaa dhaqdhaqaaq kasta.')}</p><button data-tv-focus className="primary-button" onClick={() => startWorkout(workouts[0]!)}><Play size={17} fill="currentColor" /> {t('Bilaab jimicsiga')} <ChevronRight size={17} /></button><div className="hero-meta"><span><Clock3 size={14} /> {t('5 daqiiqo')}</span><i /> <span><Activity size={14} /> 20 reps</span><i /> <span>{t('Bilow')}</span></div></div>
              <div className="hero-art" aria-hidden="true"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-sun" /><div className="art-person"><div className="person-head" /><div className="person-body" /><div className="person-arm left" /><div className="person-arm right" /><div className="person-leg left" /><div className="person-leg right" /></div><div className="float-tag reps-tag"><span>✦</span> {language === 'so' ? 'TAMAR FIICAN' : 'GOOD ENERGY'}</div><div className="float-tag ai-tag"><span className="ai-pulse" /> {language === 'so' ? 'AI TABABARE' : 'AI COACH'}</div><div className="hero-spark spark-one">✳</div><div className="hero-spark spark-two">✦</div></div>
              <div className="banner-index"><span>01</span> / 03</div>
            </section>

            <section className="workout-section">
              <div className="section-heading"><div><div className="eyebrow">{t('JIMICSI ADIGA LAGUUGU TALAGALAY')}</div><h2>{t('Dooro dhaqdhaqaaqaaga maanta')}</h2></div><button data-tv-focus className="text-link" onClick={() => setPage('workouts')}>{t('Eeg dhammaan')} <ChevronRight size={16} /></button></div>
              <WorkoutGrid items={workouts.slice(0, 3)} language={language} onSelect={startWorkout} />
            </section>

            <section className="bottom-row"><div className="tip-card"><div className="tip-icon">✦</div><div><small>{t('TALO MAANTA')}</small><p>{t('Si tartiib ah u bilow. Joogtayntu waxay ka muhiimsan tahay xawaaraha.')}</p></div><span className="tip-mark">fitliving</span></div><div className="stats-preview"><div className="preview-heading"><span>{t('HORDHAC HORUMAR')}</span><button data-tv-focus onClick={() => setPage('stats')}>{t('Faahfaahin')} <ChevronRight size={14} /></button></div><div className="preview-values"><div><strong>{totalReps}</strong><span>{t('Wadar reps')}</span></div><div><strong>{totalCalories}</strong><span>{t('Kaloori')}</span></div><div><strong>{totalMinutes}<small>m</small></strong><span>{t('Waqtiga')}</span></div><div className="mini-bars"><i /><i /><i /><i /><i /><i /><i /></div></div><button data-tv-focus className="latest-workout" onClick={() => setPage('stats')}><span className="latest-workout-icon"><Check size={14} /></span><span className="latest-workout-copy"><small>{t('Jimicsigii ugu dambeeyay')}</small><strong>{latestSession ? sessionNameInLanguage(latestSession, language) : t('Weli jimicsi lama dhamaystirin')}</strong>{latestSession && <span className="latest-workout-meta">{new Intl.DateTimeFormat(language === 'so' ? 'so-SO' : 'en-US', { dateStyle: 'medium' }).format(new Date(latestSession.date))} · {formatTime(latestSession.seconds)}</span>}</span>{latestSession && <span className="latest-workout-reps">{latestSession.reps} reps</span>}<ChevronRight size={15} /></button></div></section>
          </div>
        )}

        {page === 'workouts' && !activeWorkout && (
          <div className="page-content library-page"><div className="page-title-block"><div className="eyebrow"><span className="eyebrow-line" /> {t('URURINTA JIMICSIYADA')}</div><h1>{t('Meel u bannayso dhaqdhaqaaq')}</h1><p>{t('Jimicsi kuu habboon, waqti kasta oo aad diyaar tahay.')}</p></div><div className="category-tabs">{['Dhammaan', 'Degdeg', 'Qoys', 'Xoog'].map((item) => <button data-tv-focus key={item} className={category === item ? 'category-tab active' : 'category-tab'} onClick={() => setCategory(item)}>{t(item)}</button>)}</div><WorkoutGrid items={filteredWorkouts} language={language} onSelect={startWorkout} /></div>
        )}

        {page === 'stats' && !activeWorkout && (
          <div className="page-content stats-page"><div className="page-title-block"><div className="eyebrow"><span className="eyebrow-line" /> {t('TALLAABO YAR, GUUL WEYN')}</div><h1>{t('Horumarkaaga waa muuqdaa.')}</h1><p>{t('Dhaqdhaqaaq kasta oo aad samayso waa tallaabo horay loo qaaday.')}</p></div><div className="stats-grid"><StatCard language={language} icon={<Activity size={20} />} label={t('WADARTA REPS')} value={totalReps.toLocaleString()} color="lime" /><StatCard language={language} icon={<Flame size={20} />} label={t('KALOOORI LA GUBAY')} value={totalCalories.toLocaleString()} color="orange" /><StatCard language={language} icon={<Clock3 size={20} />} label={t('DAQIIQADO JIMICSI')} value={totalMinutes.toLocaleString()} color="violet" /><StatCard language={language} icon={<Award size={20} />} label={t('JIMICSIYO LA DHAMMEEYAY')} value={sessions.length.toString()} color="blue" /></div><section className="history-card"><div className="history-heading"><div><span className="eyebrow">{t('SAFARKAAGA')}</span><h2>{t('Jimicsiyadii ugu dambeeyay')}</h2></div><span className="history-count">{sessions.length}{t(' guud ahaan')}</span></div>{sessions.length === 0 ? <div className="empty-state"><div className="empty-icon"><Dumbbell size={23} /></div><strong>{t('Sheekadaada guushu halkan ayay ka bilaabataa')}</strong><p>{t('Dhammayso jimicsigaaga koowaad si horumarkaagu u muuqdo.')}</p><button data-tv-focus className="primary-button compact" onClick={() => setPage('workouts')}>{t('Dooro jimicsi')} <ChevronRight size={16} /></button></div> : <div className="history-list">{sessions.map((session, index) => <div className="history-row" key={`${session.date}-${index}`}><div className="history-badge"><Check size={17} /></div><div className="history-name"><strong>{sessionNameInLanguage(session, language)}</strong><span>{new Intl.DateTimeFormat(language === 'so' ? 'so-SO' : 'en-US', { dateStyle: 'medium' }).format(new Date(session.date))}</span></div><span>{session.reps} reps</span><span>{session.calories} cal</span><span>{formatTime(session.seconds)}</span></div>)}</div>}</section></div>
        )}

        {activeWorkout && (
          <section className="workout-live">
            <div className="live-header"><button data-tv-focus className="back-button" onClick={handleBack}><ArrowLeft size={17} /> {t('Ka bax')}</button><div className="live-title"><span className="live-indicator" /> {t('JIMICSI SOCDA')} <span className="live-divider">/</span> {displayWorkout?.name}</div><div className="live-header-actions"><button data-tv-focus className={voiceEnabled ? 'round-control active' : 'round-control'} aria-label={t('Codka tababaraha')} title={t('Codka tababaraha')} onClick={() => setVoiceEnabled((value) => !value)}>{voiceEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}</button><button data-tv-focus className={soundEnabled ? 'round-control active' : 'round-control'} aria-label={t('Dhawaaqyada')} title={t('Dhawaaqyada')} onClick={() => setSoundEnabled((value) => !value)}>{soundEnabled ? '♪' : '♪̸'}</button><button data-tv-focus className={musicEnabled ? 'round-control active' : 'round-control'} aria-label={language === 'so' ? 'Muusigga' : 'Music'} title={language === 'so' ? 'Muusigga' : 'Music'} onClick={() => setMusicEnabled((value) => !value)}>♫</button><button data-tv-focus className="round-control" aria-label={t('Xir tababarka')} onClick={completeWorkout}><X size={17} /></button></div></div>
            <div className="live-layout"><div className="camera-panel"><div className="camera-overlay"><video ref={videoRef} className="camera-video" playsInline muted /><canvas ref={canvasRef} className="pose-canvas" /><div className="camera-tag"><span className={cameraState === 'on' && poseReady ? 'camera-dot on' : 'camera-dot'} /> {cameraState === 'on' ? poseReady ? (activeWorkout.exercise === 'push-up' ? (language === 'so' ? 'GACMO WAA LA ARKAA' : 'ARMS IN FRAME') : (language === 'so' ? 'QOFKA WAA LA ARKAA' : 'BODY IN FRAME')) : (activeWorkout.exercise === 'push-up' ? (language === 'so' ? 'GACANTA WAA LA RAADINAYAA' : 'FINDING ARMS') : (language === 'so' ? 'QOFKA WAA LA RAADINAYAA' : 'FINDING FULL BODY')) : t('KAMARADDU WAA DAMAN TAHAY')}</div><div className={`framing-guide ${poseReady ? 'ready' : ''} ${activeWorkout.exercise === 'push-up' ? 'push-up-guide' : ''}`} aria-hidden="true">{activeWorkout.exercise === 'push-up' ? <svg className="guide-person" viewBox="0 0 260 120" focusable="false"><circle cx="28" cy="48" r="15" /><path d="M45 53 90 58 145 52 195 60 235 55M68 55 83 88 108 91M89 58 112 32M145 52 164 79 193 82M195 60 215 34M112 32 138 30M193 82 228 83" /></svg> : <svg className="guide-person" viewBox="0 0 120 240" focusable="false"><circle cx="60" cy="26" r="14" /><path d="M60 42 60 125M34 67 60 55 86 67M34 67 23 105 25 137M86 67 97 105 95 137M40 126 60 125 80 126M40 126 34 175 31 222M80 126 86 175 89 222" /></svg>}<span className="guide-label">{language === 'so' ? 'QOFKA HALKAN ISKU AADI' : 'ALIGN YOUR BODY HERE'}</span></div><div className="camera-corner top-left" /><div className="camera-corner top-right" /><div className="camera-corner bottom-left" /><div className="camera-corner bottom-right" />{cameraState !== 'on' && <div className="camera-prompt"><div className="camera-prompt-icon"><Camera size={25} /></div><strong>{cameraState === 'starting' ? t('AI-ga waa la diyaarinayaa…') : t('Ku xidh kamaradaada')}</strong><span>{cameraState === 'starting' ? t('Sug daqiiqad yar inta model-ku furmayo.') : t('AI-gu wuxuu dhaqdhaqaaqaaga ku tirinayaa si toos ah.')}</span><button data-tv-focus className="primary-button compact" disabled={cameraState === 'starting'} onClick={startCamera}>{cameraState === 'starting' ? t('Fadlan sug…') : t('Daar kamarada')} <ChevronRight size={15} /></button>{cameraError && <p className="camera-error">{t(cameraError)}</p>}</div>}{cameraState === 'on' && <div className={poseReady ? 'pose-feedback' : 'pose-feedback framing'}><span className="feedback-spark">✦</span> {feedbackInLanguage(feedback, language)}</div>}</div><div className="camera-footnote"><span>{t('AI-ga wuxuu ku shaqeeyaa qalabkaaga')}</span><span>•</span><span>{t('Fiidiyowga lama kaydiyo')}</span></div></div>
              <div className="live-side"><div className="exercise-kicker">{t('JIMICSIGA MAANTA')} <span>{displayWorkout?.level}</span></div><h2>{displayWorkout?.name}</h2><p className="live-description">{displayWorkout?.description}</p><div className="reps-counter"><div className="reps-label"><span>REPS</span><span>{t('HIMILO')} {activeWorkout.target}</span></div><div className={`reps-numbers ${repPulse ? 'rep-pulse' : ''}`}><strong>{String(reps).padStart(2, '0')}</strong><span>/ {activeWorkout.target}</span></div><button data-tv-focus className="manual-rep-button" disabled={paused || reps >= activeWorkout.target} onClick={manualRep}>+1 Rep (Space)</button><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="progress-label"><span>{progress}% {t('waa la qabtay')}</span><span>{Math.max(0, activeWorkout.target - reps)} {t('ayaa kuu dhiman')}</span></div></div><div className="live-metrics"><div><span>{t('WAQTIGA')}</span><strong>{formatTime(seconds)}</strong></div><div><span>{t('TAMARTA')}</span><strong><Flame size={16} /> {Math.round(reps * 0.4)} <small>cal</small></strong></div></div><div className="coach-note"><span className="coach-avatar">✦</span><div><small>{t('TALO TABABARE')}</small><p>{feedbackInLanguage(feedback, language)}</p></div></div><div className="live-controls"><button data-tv-focus className="secondary-button" onClick={() => { setPaused((value) => !value); setExitConfirm(false) }}>{paused ? <Play size={17} fill="currentColor" /> : <Pause size={17} fill="currentColor" />}{paused ? t('Sii wad') : t('Hakinta')}</button><button data-tv-focus className="finish-button" onClick={completeWorkout}><Check size={17} /> {t('Dhammayso')}</button></div><button data-tv-focus className="camera-toggle" onClick={cameraState === 'on' ? () => { stopCamera(); setCameraState('off'); setPoseReady(false) } : startCamera}><RotateCcw size={14} /> {cameraState === 'on' ? t('Demi kamarada') : t('Mar kale isku day')}</button></div>
            </div><div className="safety-note"><span>ⓘ</span> {t('Dhegayso jirkaaga oo samee dhaqdhaqaaq kugu habboon. Tirinta AI-gu waa qiyaas.')}</div>
            {paused && <div className="pause-overlay"><div className="pause-card">{exitConfirm ? <div className="exit-confirm" role="dialog" aria-modal="true"><span className="eyebrow">{t('NASASHO YAR')}</span><h2>{t('Ma ka baxaysaa jimicsiga oo aad Hoyga aadaysaa?')}</h2><div className="summary-actions"><button data-tv-focus className="secondary-button" onClick={goHome}>{t('Haa, bax')}</button><button data-tv-focus className="primary-button" onClick={() => { setPaused(false); setExitConfirm(false) }}>{t('Sii wad')}</button></div></div> : <><div className="pause-symbol"><Pause size={24} fill="currentColor" /></div><span className="eyebrow">{t('NASASHO YAR')}</span><h2>{t('Neefso. Waad fiican tahay.')}</h2><p>{t('Markaad diyaar tahay, sii wad halkaad joogtay.')}</p><button data-tv-focus className="primary-button" onClick={() => setPaused(false)}><Play size={16} fill="currentColor" /> {t('Sii wad jimicsiga')}</button><button data-tv-focus className="pause-end" onClick={completeWorkout}>{t('Dhammayso hadda')}</button></>}</div></div>}
          </section>
        )}

        {summary && <div className="summary-overlay" role="dialog" aria-modal="true" aria-labelledby="summary-title"><section className="summary-card"><div className="summary-celebration"><Award size={27} /></div><span className="eyebrow">{t('Jimicsi SOCDA')}</span><h1 id="summary-title">{t('Workout Complete!')}</h1><p>{workoutInLanguage(summary.workout, language).name}</p><div className="summary-stats"><div><Activity size={18} /><span>{t('Wadar reps')}</span><strong>{summary.reps}</strong></div><div><Clock3 size={18} /><span>{t('Waqtiga guud')}</span><strong>{formatTime(summary.seconds)}</strong></div><div><Flame size={18} /><span>{t('Kalooriyada la qiyaasay')}</span><strong>{summary.calories}</strong></div></div><div className="summary-actions"><button data-tv-focus className="secondary-button" onClick={goHome}>{t('Ku noqo Hoyga')}</button><button data-tv-focus className="primary-button" onClick={() => { setSummary(null); setPage('workouts') }}>{t('Jimicsi kale samee')}</button></div></section></div>}

        {historyError && <p className="storage-warning" role="status">{t(historyError)}</p>}
        <footer className="app-footer"><span>© {today.getFullYear()} FitLiving AI</span><span>{t('JIMICSI GURIGAAGA · KU HABBOON QOYSKA')}</span><button data-tv-focus className="remote-toggle" onClick={() => setShowRemote((value) => !value)}><span className="remote-led" /> {t(showRemote ? 'Qari Remote-ka' : 'Muuji Remote-ka')}</button></footer>
      </main>
      {showRemote && <VirtualRemote language={language} onHome={() => { if (activeWorkout) setPaused(true); else goHome() }} onBack={handleBack} onSelect={() => { const focused = document.activeElement; if (focused instanceof HTMLButtonElement) focused.click() }} />}
    </div>
  )
}

function WorkoutGrid({ items, language, onSelect }: { items: Workout[]; language: Language; onSelect: (workout: Workout) => void }) {
  return <div className="workout-grid">{items.map((workout, index) => {
    const display = workoutInLanguage(workout, language)
    return <button data-tv-focus className="workout-card" key={workout.id} onClick={() => onSelect(workout)}><div className={`workout-art ${workout.color}`}><span className="workout-number">0{index + 1}</span><span className="workout-emoji">{workout.emoji}</span><div className="art-label">{language === 'so' ? <>DHAQAAQ<br /><b>FARXAD LEH</b></> : <>MOVE<br /><b>WITH JOY</b></>}</div><div className="art-shape" /><div className="workout-duration"><Clock3 size={13} /> {workout.duration} {language === 'so' ? 'DAQIIQO' : 'MIN'}</div><span className="workout-arrow"><ArrowRight size={17} /></span></div><div className="workout-info"><div className="workout-info-top"><span className="workout-category">{display.category}</span><span className="workout-level">{display.level}</span></div><strong>{display.name}</strong><p>{display.description}</p><div className="workout-card-bottom"><span><Activity size={14} /> {workout.target} {language === 'so' ? 'reps' : 'reps'}</span><span>{language === 'so' ? 'Bilow' : 'Start'} <ChevronRight size={14} /></span></div></div></button>
  })}</div>
}

function StatCard({ icon, label, value, color, language }: { icon: React.ReactNode; label: string; value: string; color: string; language: Language }) {
  return <div className="stat-card"><div className={`stat-icon ${color}`}>{icon}</div><span>{label}</span><strong>{value}</strong><small>{language === 'so' ? 'Wadarta guud' : 'All time'}</small></div>
}

function VirtualRemote({ language, onHome, onBack, onSelect }: { language: Language; onHome: () => void; onBack: () => void; onSelect: () => void }) {
  return <aside className="virtual-remote" aria-label={language === 'so' ? 'Remote-ka TV-ga' : 'TV remote'}><div className="remote-title"><span className="remote-led" /> {language === 'so' ? 'FOGTA' : 'REMOTE'}</div><div className="remote-dpad"><button data-tv-focus aria-label={language === 'so' ? 'Kor' : 'Up'} onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))}><ArrowUp size={18} /></button><button data-tv-focus aria-label={language === 'so' ? 'Bidix' : 'Left'} onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))}><ArrowLeft size={18} /></button><button data-tv-focus aria-label={language === 'so' ? 'Dooro' : 'Select'} className="select-key" onClick={onSelect}><span>OK</span></button><button data-tv-focus aria-label={language === 'so' ? 'Midig' : 'Right'} onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))}><ArrowRight size={18} /></button><button data-tv-focus aria-label={language === 'so' ? 'Hoos' : 'Down'} onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))}><ArrowDown size={18} /></button></div><div className="remote-bottom"><button data-tv-focus onClick={onHome}><Home size={14} /> {language === 'so' ? 'HOY' : 'HOME'}</button><button data-tv-focus onClick={onBack}><ArrowLeft size={14} /> {language === 'so' ? 'DIB U NOQO' : 'BACK'}</button></div><span className="remote-caption">{language === 'so' ? 'HABKA REMOTE TV-GA' : 'TV REMOTE MODE'}</span></aside>
}

export default App
