/**
 * Icônes du CRM — design system Lab Learning.
 * Hugeicons (Stroke Rounded, trait 1,5 px) avec les MÊMES noms que Lucide :
 * la migration d'un fichier = changer l'import, rien d'autre.
 * Les icônes rares pas encore mappées retombent sur Lucide (aucune casse).
 */
import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  AgreementIcon,
  Alert02Icon,
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowLeft02Icon,
  ArrowRight01Icon,
  ArrowRight02Icon,
  ArrowUp01Icon,
  Attachment01Icon,
  Award01Icon,
  BankIcon,
  BirthdayCakeIcon,
  BookOpen01Icon,
  Briefcase01Icon,
  Building02Icon,
  Building03Icon,
  Calendar03Icon,
  CalendarCheckIn01Icon,
  CalendarSetting01Icon,
  Call02Icon,
  Cancel01Icon,
  CancelCircleIcon,
  ChartColumnIcon,
  CheckListIcon,
  CheckmarkCircle02Icon,
  CheckmarkSquare02Icon,
  ChefHatIcon,
  Clock01Icon,
  Clock04Icon,
  Coffee02Icon,
  CompassIcon,
  ComputerIcon,
  Copy01Icon,
  CreditCardIcon,
  DashboardSquare01Icon,
  Database01Icon,
  DateTimeIcon,
  Delete02Icon,
  Download01Icon,
  EuroIcon,
  File01Icon,
  FileDownloadIcon,
  FileEditIcon,
  FileVerifiedIcon,
  Files01Icon,
  FilterIcon,
  FloppyDiskIcon,
  FolderAddIcon,
  FolderCheckIcon,
  FolderOpenIcon,
  Globe02Icon,
  GridViewIcon,
  Home01Icon,
  Idea01Icon,
  Image01Icon,
  InformationCircleIcon,
  Invoice01Icon,
  Invoice02Icon,
  Invoice03Icon,
  LeftToRightListBulletIcon,
  Legal01Icon,
  Link01Icon,
  LinkSquare01Icon,
  Loading03Icon,
  Location01Icon,
  Logout01Icon,
  Mail01Icon,
  MailboxIcon,
  Menu01Icon,
  Message01Icon,
  MinusSignIcon,
  MoreHorizontalIcon,
  Mortarboard01Icon,
  Notification03Icon,
  OfficeIcon,
  Passport01Icon,
  PencilEdit01Icon,
  PencilEdit02Icon,
  PercentIcon,
  PlayIcon,
  PrinterIcon,
  QrCodeIcon,
  QuoteDownIcon,
  RefreshIcon,
  Restaurant01Icon,
  RestaurantIcon,
  RotateLeft01Icon,
  Route01Icon,
  Search01Icon,
  SecurityCheckIcon,
  SentIcon,
  Settings01Icon,
  Settings02Icon,
  Shield01Icon,
  ShieldAlertIcon,
  ShoppingCart01Icon,
  SparklesIcon,
  SquareLock02Icon,
  StarIcon,
  StickyNote02Icon,
  Tag01Icon,
  Target02Icon,
  TaskDaily01Icon,
  TaskDone01Icon,
  ThumbsUpIcon,
  Tick02Icon,
  TimerIcon,
  TradeUpIcon,
  UnavailableIcon,
  Upload01Icon,
  UserAdd01Icon,
  UserCheck01Icon,
  UserGroupIcon,
  UserIcon,
  UserRemove01Icon,
  UserSettings01Icon,
  Video01Icon,
  ViewIcon,
  Wallet01Icon,
  WheelchairIcon,
} from '@hugeicons/core-free-icons'

export type LucideIcon = React.ComponentType<{
  className?: string
  size?: number | string
  strokeWidth?: number | string
  color?: string
}>

/** Enveloppe : icône Hugeicons avec l'API d'une icône Lucide (className, size). */
function hugeify(icone: any): LucideIcon {
  const Comp = ({ className, size = 24, strokeWidth = 1.5, color = 'currentColor', ...rest }: any) => (
    <HugeiconsIcon icon={icone} className={className} size={size} strokeWidth={strokeWidth} color={color} {...rest} />
  )
  return Comp
}

export const Accessibility = hugeify(WheelchairIcon)
export const AlertCircle = hugeify(AlertCircleIcon)
export const AlertTriangle = hugeify(Alert02Icon)
export const ArrowLeft = hugeify(ArrowLeft02Icon)
export const ArrowRight = hugeify(ArrowRight02Icon)
export const Award = hugeify(Award01Icon)
export const Ban = hugeify(UnavailableIcon)
export const BarChart3 = hugeify(ChartColumnIcon)
export const Bell = hugeify(Notification03Icon)
export const BookOpen = hugeify(BookOpen01Icon)
export const Briefcase = hugeify(Briefcase01Icon)
export const Building = hugeify(Building02Icon)
export const Building2 = hugeify(Building03Icon)
export const Cake = hugeify(BirthdayCakeIcon)
export const Calendar = hugeify(Calendar03Icon)
export const CalendarCheck = hugeify(CalendarCheckIn01Icon)
export const CalendarClock = hugeify(CalendarSetting01Icon)
export const CalendarRange = hugeify(DateTimeIcon)
export const Check = hugeify(Tick02Icon)
export const CheckCircle2 = hugeify(CheckmarkCircle02Icon)
export const CheckSquare = hugeify(CheckmarkSquare02Icon)
export const ChefHat = hugeify(ChefHatIcon)
export const ChevronDown = hugeify(ArrowDown01Icon)
export const ChevronLeft = hugeify(ArrowLeft01Icon)
export const ChevronRight = hugeify(ArrowRight01Icon)
export const ChevronUp = hugeify(ArrowUp01Icon)
export const ClipboardCheck = hugeify(TaskDone01Icon)
export const ClipboardList = hugeify(TaskDaily01Icon)
export const Clock = hugeify(Clock01Icon)
export const Coffee = hugeify(Coffee02Icon)
export const Compass = hugeify(CompassIcon)
export const Copy = hugeify(Copy01Icon)
export const CreditCard = hugeify(CreditCardIcon)
export const Database = hugeify(Database01Icon)
export const Download = hugeify(Download01Icon)
export const Euro = hugeify(EuroIcon)
export const ExternalLink = hugeify(LinkSquare01Icon)
export const Eye = hugeify(ViewIcon)
export const FileCheck = hugeify(FileVerifiedIcon)
export const FileDown = hugeify(FileDownloadIcon)
export const FileSignature = hugeify(FileEditIcon)
export const FileText = hugeify(File01Icon)
export const Files = hugeify(Files01Icon)
export const Filter = hugeify(FilterIcon)
export const FolderCheck = hugeify(FolderCheckIcon)
export const FolderOpen = hugeify(FolderOpenIcon)
export const FolderPlus = hugeify(FolderAddIcon)
export const Globe = hugeify(Globe02Icon)
export const GraduationCap = hugeify(Mortarboard01Icon)
export const Handshake = hugeify(AgreementIcon)
export const History = hugeify(Clock04Icon)
export const Home = hugeify(Home01Icon)
export const IdCard = hugeify(Passport01Icon)
export const Image = hugeify(Image01Icon)
export const Info = hugeify(InformationCircleIcon)
export const Landmark = hugeify(BankIcon)
export const LayoutDashboard = hugeify(DashboardSquare01Icon)
export const LayoutGrid = hugeify(GridViewIcon)
export const Lightbulb = hugeify(Idea01Icon)
export const Link2 = hugeify(Link01Icon)
export const List = hugeify(LeftToRightListBulletIcon)
export const ListChecks = hugeify(CheckListIcon)
export const Loader2 = hugeify(Loading03Icon)
export const Lock = hugeify(SquareLock02Icon)
export const LogOut = hugeify(Logout01Icon)
export const Mail = hugeify(Mail01Icon)
export const Mails = hugeify(MailboxIcon)
export const MapPin = hugeify(Location01Icon)
export const Menu = hugeify(Menu01Icon)
export const MessageSquare = hugeify(Message01Icon)
export const Minus = hugeify(MinusSignIcon)
export const Monitor = hugeify(ComputerIcon)
export const MoreHorizontal = hugeify(MoreHorizontalIcon)
export const Paperclip = hugeify(Attachment01Icon)
export const PenLine = hugeify(PencilEdit01Icon)
export const Pencil = hugeify(PencilEdit02Icon)
export const Percent = hugeify(PercentIcon)
export const Phone = hugeify(Call02Icon)
export const Play = hugeify(PlayIcon)
export const Plus = hugeify(Add01Icon)
export const Printer = hugeify(PrinterIcon)
export const QrCode = hugeify(QrCodeIcon)
export const Quote = hugeify(QuoteDownIcon)
export const Receipt = hugeify(Invoice01Icon)
export const ReceiptEuro = hugeify(Invoice03Icon)
export const ReceiptText = hugeify(Invoice02Icon)
export const RefreshCw = hugeify(RefreshIcon)
export const RotateCcw = hugeify(RotateLeft01Icon)
export const Route = hugeify(Route01Icon)
export const Save = hugeify(FloppyDiskIcon)
export const Scale = hugeify(Legal01Icon)
export const Search = hugeify(Search01Icon)
export const Send = hugeify(SentIcon)
export const Settings = hugeify(Settings01Icon)
export const Settings2 = hugeify(Settings02Icon)
export const Shield = hugeify(Shield01Icon)
export const ShieldAlert = hugeify(ShieldAlertIcon)
export const ShieldCheck = hugeify(SecurityCheckIcon)
export const ShoppingCart = hugeify(ShoppingCart01Icon)
export const Sparkles = hugeify(SparklesIcon)
export const Stamp = hugeify(OfficeIcon)
export const Star = hugeify(StarIcon)
export const StickyNote = hugeify(StickyNote02Icon)
export const Tag = hugeify(Tag01Icon)
export const Target = hugeify(Target02Icon)
export const ThumbsUp = hugeify(ThumbsUpIcon)
export const Timer = hugeify(TimerIcon)
export const Trash2 = hugeify(Delete02Icon)
export const TrendingUp = hugeify(TradeUpIcon)
export const Upload = hugeify(Upload01Icon)
export const User = hugeify(UserIcon)
export const UserCheck = hugeify(UserCheck01Icon)
export const UserCog = hugeify(UserSettings01Icon)
export const UserPlus = hugeify(UserAdd01Icon)
export const UserRound = hugeify(UserIcon)
export const UserX = hugeify(UserRemove01Icon)
export const Users = hugeify(UserGroupIcon)
export const Utensils = hugeify(Restaurant01Icon)
export const UtensilsCrossed = hugeify(RestaurantIcon)
export const Video = hugeify(Video01Icon)
export const Wallet = hugeify(Wallet01Icon)
export const X = hugeify(Cancel01Icon)
export const XCircle = hugeify(CancelCircleIcon)

// Pas encore mappées : rendu Lucide (visuellement proche, à migrer plus tard)
export {
  BadgeEuro,
  Banknote,
  Beef,
  Calculator,
  CalendarDays,
  Camera,
  Circle,
  CircleUserRound,
  ClipboardPaste,
  Construction,
  Croissant,
  Eraser,
  FilePenLine,
  FilePlus2,
  FileQuestion,
  FileStack,
  FileUp,
  FileWarning,
  Hash,
  ImagePlus,
  KeyRound,
  Layers,
  LifeBuoy,
  LogIn,
  MailOpen,
  MessageCircle,
  Mic,
  MinusCircle,
  Network,
  Pen,
  PenTool,
  PhoneCall,
  Presentation,
  Repeat,
  ShieldOff,
  Square,
  Store,
  Unlink,
  UserCircle,
  UserMinus,
  Wrench,
  Zap,
} from 'lucide-react'

// Complément détecté par le compilateur — repli Lucide
export {
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle,
  ChevronsUpDown,
  CircleCheck,
  CircleDot,
  Clipboard,
  Columns3,
  Edit3,
  EyeOff,
  FileCheck2,
  FilePen,
  FilePlus,
  FileX,
  Flame,
  Folder,
  FolderTree,
  HeartPulse,
  HelpCircle,
  Link,
  Map,
  MessageSquareWarning,
  MonitorSmartphone,
  PanelLeft,
  PanelLeftClose,
  PieChart,
  Rocket,
  Snowflake,
  Table2,
  ThumbsDown,
  Webhook,
} from 'lucide-react'
