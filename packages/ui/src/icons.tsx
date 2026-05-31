/**
 * Icon adapter. The prototype used a custom name-based icon registry; the stack
 * standardizes on lucide-react. This maps the prototype's icon names onto Lucide
 * components so the rest of the app keeps the ergonomic `<Icon name="home" />` API.
 */
import {
  Activity,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock,
  Cloud,
  CloudRain,
  Crosshair,
  Database,
  Filter,
  Flame,
  Goal,
  Home,
  Info,
  LayoutGrid,
  List,
  ListOrdered,
  MapPin,
  Menu,
  Network,
  Pause,
  Play,
  Plus,
  Presentation,
  Route,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  StickyNote,
  Sun,
  Moon,
  Download,
  Printer,
  Target,
  Trophy,
  User,
  Users,
  X,
  Mic,
  Share2,
  Camera,
  Volume2,
  VolumeX,
  type LucideIcon,
} from 'lucide-react';
import type { CSSProperties } from 'react';

const REGISTRY: Record<string, LucideIcon> = {
  home: Home,
  calendar: CalendarDays,
  teams: Shield,
  mic: Mic,
  share: Share2,
  camera: Camera,
  players: Users,
  standings: ListOrdered,
  bracket: Network,
  stats: BarChart3,
  venues: MapPin,
  star: Sparkles, // reserved; favorites use the dedicated Star below
  ai: Sparkles,
  search: Search,
  bell: Bell,
  settings: Settings,
  chevR: ChevronRight,
  chevL: ChevronLeft,
  chevD: ChevronDown,
  menu: Menu,
  arrowL: ArrowLeft,
  arrowR: ArrowRight,
  ball: CircleDot,
  clock: Clock,
  pin: MapPin,
  plus: Plus,
  close: X,
  filter: Filter,
  whistle: Goal,
  sub: ArrowLeftRight,
  note: StickyNote,
  trophy: Trophy,
  flame: Flame,
  target: Target,
  shield: Shield,
  grid: LayoutGrid,
  list: List,
  send: Send,
  user: User,
  check: Check,
  info: Info,
  sparkSmall: Sparkles,
  swap: ArrowLeftRight,
  present: Presentation,
  play: Play,
  pause: Pause,
  cloud: Cloud,
  sun: Sun,
  moon: Moon,
  download: Download,
  print: Printer,
  rain: CloudRain,
  route: Route,
  crosshair: Crosshair,
  activity: Activity,
  database: Database,
  volume: Volume2,
  mute: VolumeX,
};

export type IconName = keyof typeof REGISTRY | (string & {});

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, className, style, strokeWidth = 1.8 }: IconProps) {
  const Cmp = REGISTRY[name] ?? Info;
  return <Cmp size={size} className={className} style={style} strokeWidth={strokeWidth} aria-hidden />;
}
