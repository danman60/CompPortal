/**
 * Elite Icon System
 * Lucide React icons with consistent 24px optical size and 2px stroke weight
 * Replaces emoji system for professional polish
 */

import {
  // Navigation & Actions
  Target,
  DollarSign,
  Theater,
  Building2,
  FileText,
  Tent,
  Calendar,
  Gavel,
  Trophy,
  BarChart3,
  FileOutput,
  Mail,
  Music,
  User,
  Users,
  Settings,
  LogOut,
  Plus,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Home,
  Menu,
  MoreHorizontal,
  Save,
  Send,
  Star,
  Heart,
  Bell,
  Info,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Loader2,
  RefreshCw,
  Clock,
  MapPin,
  Phone,
  Mail as MailIcon,
  Link as LinkIcon,
  Image,
  Video,
  File,
  Folder,
  FolderOpen,
  Grid,
  List,
  Table as TableIcon,
  Layers,
  Zap,
  Sparkles,
  Award,
  Shield,
  Lock,
  Unlock,
  Key,
  CreditCard,
  Wallet,
  Receipt,
  ShoppingCart,
  Tag,
  Percent,
  Hash,
  AtSign,
  Paperclip,
  Share2,
  BookOpen,
  Bookmark,
  Flag,
  MessageSquare,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  PieChart,
  LineChart,
  BarChart2,
} from 'lucide-react';

/**
 * Standard icon props for consistency
 * 24px size, 2px stroke, inherit color
 */
export const iconProps = {
  size: 24,
  strokeWidth: 2,
  className: 'text-current',
} as const;

/**
 * Icon mapping - maps old emojis to Lucide components
 */
export const iconMap = {
  // Dashboard Icons
  '🎯': Target,
  '💰': DollarSign,
  '🎭': Theater,
  '🏢': Building2,
  '📋': FileText,
  '🎪': Tent,
  '📅': Calendar,
  '👨‍⚖️': Gavel,
  '💯': Trophy,
  '📊': BarChart3,
  '📄': FileOutput,
  '📨': Mail,
  '🎵': Music,

  // User & People
  '👤': User,
  '👥': Users,
  '💃': Users, // Dancers
  '🩰': Users, // Ballet/Dancers

  // Actions
  '⚙️': Settings,
  '🔓': LogOut,
  '➕': Plus,
  '✅': CheckCircle,
  '❌': XCircle,
  '←': ArrowLeft,
  '→': ArrowRight,
  '↺': RefreshCw,

  // Status & Feedback
  '⭐': Star,
  '🏆': Trophy,
  '✨': Sparkles,
  '🔨': Settings, // REBUILD marker
  '🎨': Sparkles, // Create/Design

  // Communication
  '📧': MailIcon,
  '💬': MessageSquare,
  '🔔': Bell,

  // Files & Data
  '📁': Folder,
  '📂': FolderOpen,
  '🗂️': Layers,
  '🎞️': Video,
  '🖼️': Image,

  // Financial
  '💳': CreditCard,
  '🧾': Receipt,
  '💵': DollarSign,

  // Misc
  '🔍': Search,
  '📤': Upload,
  '📥': Download,
  '🎁': Tag,
  '🏅': Award,
  '🎓': BookOpen,
  '📍': MapPin,
  '⏰': Clock,
  '🔗': LinkIcon,
  '🎬': Video,
  '🎤': Music,
  '🎹': Music,
  '🎸': Music,
} as const;

/**
 * Get Lucide icon component from emoji
 * @param emoji - The emoji to convert
 * @returns Lucide icon component
 */
export function getIconFromEmoji(emoji: string) {
  return iconMap[emoji as keyof typeof iconMap] || HelpCircle;
}

/**
 * Icon component wrapper with consistent styling
 */
interface IconProps {
  name: keyof typeof iconMap | React.ComponentType<any>;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function Icon({ name, size = 24, strokeWidth = 2, className = '' }: IconProps) {
  const IconComponent = typeof name === 'string' ? getIconFromEmoji(name) : name;

  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      className={className || 'text-current'}
    />
  );
}

// Export commonly used icons for direct import
export {
  Target,
  DollarSign,
  Theater,
  Building2,
  FileText,
  Tent,
  Calendar,
  Gavel,
  Trophy,
  BarChart3,
  FileOutput,
  Mail,
  Music,
  User,
  Users,
  Settings,
  LogOut,
  Plus,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
};
